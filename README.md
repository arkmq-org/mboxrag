# Mailing list bot

This project is a evovling proof of concept application of a bot answering
questions about a list of mails.

This works using a RAG (Retrieval Augmented Generation) and a LLM for the human
interaction.

## Server

Populate a `.env` file at the root of the repository with the following
variables set:

```
URI=./milvus_demo.db
CREATE_MILVUS_DATABASE=True
MBOX_DIR=
MODEL_API_URL=
MODEL=
MODEL_ACCESS_TOKEN=
```

* `MBOX_DIR` must point to folder where there are .mbox files
* `CREATE_MILVUS_DATABASE` is to be set to true to initialize the DB and to false
  if you don't want to go through the generation a second time. (It's time
  consuming)
* `MODEL`, `MODEL_API_URL` and `MODEL_ACCESS_TOKEN` are related to the model
  that will be used for the LLM, you can use granite or any other LLM as long as
  you have
  enough credentials to access these.

Then execute the following:

```bash
python -m venv .venv
source .venv/bin/activate
cd server
pip install -r requirements.txt
fastapi dev main.py
```

Finally, once the service is loaded and you see `Successfully loaded Milvus!` in
the logs, you can curl the service:

```bash
curl -X 'POST' \
  'http://127.0.0.1:8000/ask' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "question": "Summarize the thread 'type some subject there', list participants and dates of responses"
}'
```
