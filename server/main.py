from contextlib import asynccontextmanager
from ctypes import ArgumentError
from fastapi import FastAPI

from uuid import uuid4

from fastapi.responses import JSONResponse
from numpy import e
from sqlalchemy.sql.ddl import exc
from mboxtopandas import mbox_to_pandas
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_milvus import Milvus
from dotenv import load_dotenv
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from pydantic import BaseModel
import os
load_dotenv()

import logging
logger = logging.getLogger('uvicorn.errors')

from fastapi.middleware.cors import CORSMiddleware

def connect_to_milvus():
    embeddings = HuggingFaceEmbeddings(model_name="mixedbread-ai/mxbai-embed-large-v1")
    logger.info("Connecting to Milvus!")
    connection_args={"uri": os.getenv('URI')}
    if os.getenv('MILVUS_TOKEN'):
        connection_args["token"] = os.getenv('MILVUS_TOKEN')
    if os.getenv('MILVUS_TOKEN'):
        connection_args["db_name"] = os.getenv('MILVUS_DB')
    app.state.vectorstore = Milvus(
            embedding_function=embeddings,
            connection_args=connection_args,
            index_params={"index_type": "FLAT", "metric_type": "L2"},
            consistency_level="Strong",
            drop_old=os.getenv('CREATE_MILVUS_DATABASE') == 'True',  # set to True if seeking to drop the collection with that name if it exists
            )

def load_documents_to_populate_milvus():
    if os.getenv('MBOX_DIR') is None:
        raise ArgumentError('please specify a directory to find the mailboxes in the env variable MBOX_DIR')
    m = mbox_to_pandas(os.getenv('MBOX_DIR')) # type: ignore
    documents : list[Document] = [
            Document(page_content=Body, metadata={"Sender": From, "Date": Date, "Subject": Subject}, id=uuid4())
            for Body, From, Date, Subject in zip(m['Body'], m['From'], m['Date'], m['Subject'])
            ]
    logger.info(f"{len(documents)} mails loaded")
    if os.getenv('CHUNK_DOCS') == 'True':
        if os.getenv('CHUNK_SIZE') is None:
            raise ArgumentError('CHUNK_SIZE is missing in env')
        if os.getenv('CHUNK_OVERLAP') is None:
            raise ArgumentError('CHUNK_OVERLAP in missing in env')
        logger.info("chunking documents")
        # Initialize chunking
        text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=int(os.getenv('CHUNK_SIZE')), # type: ignore
                chunk_overlap=int(os.getenv('CHUNK_OVERLAP')) # type: ignore
                )
        return text_splitter.split_documents(documents)
    return documents

def populate_database():
    if os.getenv('CREATE_MILVUS_DATABASE') == 'True':
        logger.info("populating DB, it can take a while")
        documents = load_documents_to_populate_milvus()
        uuids = [str(uuid4()) for _ in range(len(documents))]
        app.state.vectorstore.add_documents(documents=documents, ids=uuids)

def get_llm():
    if os.getenv('MODEL') is None:
        raise ArgumentError('MODEL is missing from env')
    if os.getenv('MODEL_API_URL') is None:
        raise ArgumentError('MODEL_API_URL is missing from env')
    if os.getenv('MODEL_ACCESS_TOKEN') is None:
        raise ArgumentError('MODEL_ACCESS_TOKEN is missing from env')
    model = os.getenv('MODEL')
    model_api_url = os.getenv('MODEL_API_URL')
    access_token = os.getenv('MODEL_ACCESS_TOKEN')

    return ChatOpenAI(model=model, api_key=access_token, base_url=model_api_url, temperature=0.1) # type: ignore

def fetch_context():
    milvus: Milvus = app.state.vectorstore
    # Create the chain
    def format_docs(docs : list[Document]):
        context = ""
        for doc in docs:
            context += f"{doc.metadata}: \n {doc.page_content}:\n---------------\n\n"
        return context

    return milvus.as_retriever() | format_docs

def define_rag_pipeline():
    prompt_template = """
    Human: You are an AI assistant, and provides answers to questions by using fact based and statistical information when possible.
    Use the following pieces of information to provide a complete answer to the question enclosed in <question> tags.
    If you don't know the answer, just say that you don't know, don't try to make up an answer.
    <context>
    {context}
    </context>

    <question>
    {question}
    </question>

    The response should be specific and use statistics or numbers when possible.

    Assistant:"""

    app.state.rag_chain =  (
            {
                "context": fetch_context(),
                "question": RunnablePassthrough()
            }
            | PromptTemplate(
                template=prompt_template,
                input_variables=["context", "question"]
            )
            | get_llm()
            | StrOutputParser()
            )

@asynccontextmanager
async def lifespan(_: FastAPI):
    connect_to_milvus()
    populate_database()
    logger.info("Successfully loaded Milvus!")
    define_rag_pipeline()
    yield
    logger.info('shutdown')

class Question(BaseModel):
    question: str
class Answer(BaseModel):
    answer: str
class Error(BaseModel):
    error: str

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost",
    "http://localhost:9000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/ask", response_model=Answer, responses={500: {"model": Error}})
async def ask(question : Question):
    try:
        res = app.state.rag_chain.invoke(question.question)
        return {"answer": res}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"{e}"})


