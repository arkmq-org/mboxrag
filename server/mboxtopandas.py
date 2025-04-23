import os
import mailbox
import re
from dotenv import load_dotenv

import pandas as pd
import logging
logger = logging.getLogger('uvicorn.errors')

def clean_addresses(addresses):
    if addresses is None:
        return []
    addresses = addresses.replace("\'", "")
    addressList = re.split('[,;]', addresses)
    cleanList = []
    for address in addressList:
        cleanAddress = clean_address(address)
        cleanList.append(cleanAddress)
    return cleanList

def clean_address(address):
    address = address.replace("<", "")
    address = address.replace(">", "")
    address = address.replace("\"", "")
    address = address.replace("\n", " ")
    address = address.replace("MAILER-DAEMON", "")
    address = address.lower().strip()

    email = None
    clean_email = ""
    for word in address.split(' '):
        email_regex = re.compile(
                "^[a-zA-Z0-9._%-]+@[a-zA-Z0-9._%-]+.[a-zA-Z]{2,6}$"
                )
        email = re.match(email_regex, word)
        if email is not None:
            clean_email = email.group(0)
    if email is None:
        if address.split(' ')[-1].find('@') > -1:
            clean_email = address.split(' ')[-1].strip()
        elif address.split(' ')[-1].find('?') > -1:
            clean_email = 'n/a'
        else:
            clean_email = address
    return clean_email

def get_charset(content_type: str):
    charset = 'utf-8'
    if content_type and len(content_type.split("charset=")) > 1:
        charset = content_type.split("charset=")[1]
    return charset

def write_table(mboxfile, mailTable):
    for message in mailbox.mbox(mboxfile):
        cleanFrom = clean_address(message['From'])
        cleanTo = clean_addresses(message['To'])
        cleanCc = clean_addresses(message['Cc'])

        payload = b''
        charset = 'utf-8'
        if message.is_multipart:
            for part in message.walk():
                if part.get_content_type() == 'text/plain':
                    # Get the subpart payload (i.e the message body)
                    content_type = part["content-type"]
                    charset = get_charset(content_type)
                    payload = part.get_payload(decode=True)
        else:
            content_type = message["content-type"]
            charset = get_charset(content_type)
            payload = message.get_payload(decode=True)


        try:
            payload = payload.decode(charset)# type: ignore
        except LookupError:
            payload = payload.decode('utf-8')# type: ignore
        except UnicodeDecodeError:
            logger.info("can't decode message, it'll be stored as a byte array")
        except AttributeError:
            logger.info("already a string, no need to decode")
        mailTable.append([
            cleanFrom,
            cleanTo,
            cleanCc,
            message['Date'],
            message['Subject'],
            payload,
            message['Message-ID'],
            ])


def mbox_to_pandas(pathToEmails  = './'):
    mboxfiles = [os.path.join(dirpath, f)
                 for dirpath, _, files in os.walk(pathToEmails)
                 for f in files if f.endswith('mbox')]
    mailTable = []

    for mboxfile in mboxfiles:
        write_table(mboxfile, mailTable)

    m = pd.DataFrame(mailTable)
    m.columns = ['From', 'To', 'Cc', 'Date', 'Subject', 'Body', 'Message-ID']
    return m

if __name__ == '__main__':
    load_dotenv()
    m = mbox_to_pandas(os.getenv('MBOX_DIR')) # type: ignore
    logger.info(m)

