#!/usr/bin/env sh

DEFAULT_IMAGE="quay.io/arkmq-org/mbox-rag-server:latest"

AWS_REGION=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
S3_BUCKET_DB=""
S3_BUCKET_MAILS=""

MODEL_API_URL=""
MODEL=""
MODEL_ACCESS_TOKEN=""

API_SERVER_IMAGE=${DEFAULT_IMAGE}

SCRIPT_NAME=$(basename "$0")

function printUsage() {
  echo "${SCRIPT_NAME}: Deploying to openshift"
  echo "Usage:"
  echo "  ./${SCRIPT_NAME} -i|--image <image url>"
  echo "Options: "
  echo "  -i|--image  Specify the plugin image to deploy. (default is ${DEFAULT_IMAGE})"
  echo "  -m|--model  set the llm model to be used"
  echo "  -a|--model-api-url  set the llm api url"
  echo "  -t|--model-access-token  set the llm access token"
  echo "  -k|--aws-key-id"
  echo "  -s|--aws-secret-key"
  echo "  -r|--aws-region"
  echo "  -d|--bucket-db"
  echo "  -M|--bucket-mails"
  echo "  -h|--help   Print this message."
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      printUsage
      exit 0
      ;;
    -i|--image)
      API_SERVER_IMAGE="$2"
      shift
      shift
      ;;
    -m|--model)
      MODEL="$2"
      shift
      shift
      ;;
    -a|--model-api-url)
      MODEL_API_URL="$2"
      shift
      shift
      ;;
    -t|--model-access-token)
      MODEL_ACCESS_TOKEN="$2"
      shift
      shift
      ;;
    -k|--aws-key)
      AWS_ACCESS_KEY_ID="$2"
      shift
      shift
      ;;
    -s|--aws-secret-key)
      AWS_SECRET_ACCESS_KEY="$2"
      shift
      shift
      ;;
    -r|--aws-region)
      AWS_REGION="$2"
      shift
      shift
      ;;
    -d|--bucket-db)
      S3_BUCKET_DB="$2"
      shift
      shift
      ;;
    -M|--bucket-mails)
      S3_BUCKET_MAILS="$2"
      shift
      shift
      ;;
    -*|--*)
      echo "Unknown option $1"
      printUsage
      exit 1
      ;;
    *)
      ;;
  esac
done

if [ -z "${MODEL}" ]; then
    echo "model must be set"
    printUsage
    exit 1
fi
if [ -z "${MODEL_API_URL}" ]; then
    echo "model api url must be set"
    printUsage
    exit 1
fi
if [ -z "${MODEL_ACCESS_TOKEN}" ]; then
    echo "model access token must be set"
    printUsage
    exit 1
fi
if [ -z "${AWS_REGION}" ]; then
    echo "aws region must be set"
    printUsage
    exit 1
fi
if [ -z "${AWS_ACCESS_KEY_ID}" ]; then
    echo "aws access key id must be set"
    printUsage
    exit 1
fi
if [ -z "${AWS_SECRET_ACCESS_KEY}" ]; then
    echo "aws secret access key must be set"
    printUsage
    exit 1
fi
if [ -z "${S3_BUCKET_DB}" ]; then
    echo "DB buckedt must be set"
    printUsage
    exit 1
fi
if [ -z "${S3_BUCKET_MAILS}" ]; then
    echo "mails bucket must be set"
    printUsage
    exit 1
fi

# retrieve the cluster domain to produce a valid cluster issuer
clusterDomain=$(oc get -n openshift-ingress-operator ingresscontroller/default -o json | jq -r '.status.domain')
if test -z "$clusterDomain"
then
  echo "The cluster domain can't be retrieved"
  exit 1
fi
echo "cluster domain: $clusterDomain"

echo "deploying using image: ${API_SERVER_IMAGE}"
oc kustomize deploy \
    | sed "s|image: .*|image: ${API_SERVER_IMAGE}|" \
    | sed "s|value: model-api-url|value: ${MODEL_API_URL}|" \
    | sed "s|value: model-name|value: ${MODEL}|" \
    | sed "s|value: model-token|value: ${MODEL_ACCESS_TOKEN}|" \
    | sed "s|apps.crc.testing|${clusterDomain}|" \
    | sed "s|aws_access_key_id|${AWS_ACCESS_KEY_ID}|" \
    | sed "s|aws_secret_access_key|${AWS_SECRET_ACCESS_KEY}|" \
    | sed "s|aws_region|${AWS_REGION}|" \
    | sed "s|amq-rag-db|${S3_BUCKET_DB}|" \
    | sed "s|amq-rag-mails|${S3_BUCKET_MAILS}|" \
    | oc apply -f -
