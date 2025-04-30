# Mailing list bot

This project is a evovling proof of concept application of a bot answering
questions about a list of mails.

This works using a RAG (Retrieval Augmented Generation) and a LLM for the human
interaction.

![Screenshot From 2025-04-24 16-58-57](https://github.com/user-attachments/assets/e8f344d0-b7cd-41ac-a53c-afb127673a00)

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

### container

#### extra certs

Put in the `extra_certs` directory all the additional PEM files needed to access
the services you need (i.e if the inference server needs particlar certs, add
them in this folder before the build)

#### build

```bash
cd server
podman build -t quay.io/arkmq-org/mboxrag-server:latest .
podman push quay.io/arkmq-org/mboxrag-server:latest # optionally push to quay
```

### run

```bash
podman run --env-file .env -v $(pwd)/db:/server/db:Z,U -p 8000:8000 -it quay.io/arkmq-org/mboxrag-server:latest
```

`.env` needs to be configured as explained in the server section.

You can share a DB folder containing a pre-populated milvus database and mount
it into the container, the above command line would work in combination with
the following env:

```
URI=./db/milvus_demo.db
CREATE_MILVUS_DATABASE=False
MODEL_API_URL= # has to be set!
MODEL= # has to be set!
MODEL_ACCESS_TOKEN= # has to be set!
```

Be sure you set every needed variable though.


### K8s or OpenShit deployment

Once you have build and pushed your image to the registry of your choice, you
can deploy the server to a k8s compatible cluster:

```bash
cd server
./deploy.sh \
    -i ${CONTAINER_URL}\
    -a ${MODEL_URL} \
    -m ${MODEL_NAME} \
    -t ${MODEL_ACCESS_TOKEN}
```

Once the pod has started it'll need some data to work, depending on the
configuration of the `CREATE_MILVUS_DATABASE` variable, provide either a list of
mails of a list of databases files for milvus:

To get the name of the pod:

```bash
POD_NAME=$(oc apply -f -oc -o json get pods -n mbox-rag-server | jq -r .items[0].metadata.name)
```

To copy mails:

```bash
oc cp mails mbox-rag-server/${POD_NAME}:/server -c init-mbox-rag
```

To copy the database files:

```bash
oc cp db mbox-rag-server/${POD_NAME}:/server -c init-mbox-rag
```

It is important that the mails endup in the `/server/mails` directory and that
the dbs endup in the `/server/db` directory. The init container will wait for
either of those directories to get populated.

Finally, visit the cluster route that was exposed to find the service:
http://mboxrag-server-mbox-rag-server.apps-crc.testing/docs

## Frontend

After having started the server in one terminal, install the dependencies and
start the frontend server:

```
cd Frontend
yarn
yarn start:dev
```

Visit http://localhost:9000 to start chatting with the bot.

### container

#### build

```bash
cd server
podman build -t quay.io/arkmq-org/mboxrag-frontend:latest .
podman push quay.io/arkmq-org/mboxrag-frontend:latest # optionally push to quay
```

### run

```bash
podman run 8080:8080 -it quay.io/arkmq-org/mboxrag-frontend:latest
```

Then visit http://localhost:8080

### K8s or OpenShit deployment

Once you have build and pushed your image to the registry of your choice, you
can deploy the frontend to a k8s compatible cluster:

```bash
cd server
./deploy.sh \
    -i ${CONTAINER_URL}\
```

Finally, visit the cluster route that was exposed to find the service:
http://mboxrag-frontend-mbox-rag-frontend.apps-crc.testing

And you can start chatting with your bot.
