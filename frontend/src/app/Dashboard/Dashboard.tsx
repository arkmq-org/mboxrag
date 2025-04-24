import {PageSection} from '@patternfly/react-core';
import * as React from 'react';

const userAvatar = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Identicon.svg/1920px-Identicon.svg.png";
const patternflyAvatar = "https://avatars.githubusercontent.com/u/6391110?s=48&v=4";

import {Chatbot, ChatbotContent, ChatbotDisplayMode, ChatbotFooter, ChatbotFootnote, ChatbotWelcomePrompt, Message, MessageBar, MessageBox, MessageProps} from '@patternfly/chatbot';
import {useDefaultServiceAskAskPost} from 'src/openapi/queries';
import {Answer} from 'src/openapi/requests/models/Answer';

const footnoteProps = {
  label: 'Check for mistakes.',
  popover: {
    title: 'Verify accuracy',
    description: `While the bot strives for accuracy, there's always a possibility of errors. It's a good practice to verify critical information from reliable sources, especially if it's crucial for decision-making or actions.`,
    bannerImage: {
      src: 'https://cdn.dribbble.com/userupload/10651749/file/original-8a07b8e39d9e8bf002358c66fce1223e.gif',
      alt: 'Example image for footnote popover'
    },
    link: {
      label: 'Learn more',
      url: 'https://www.redhat.com/'
    }
  }
};


export const ChatbotDemo: React.FunctionComponent = () => {
  const [messages, setMessages] = React.useState<MessageProps[]>([]);
  const [isSendButtonDisabled, setIsSendButtonDisabled] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState<string>();
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);

  const updateLastMessage = (content: string, isError: boolean) => {
    console.log(isError)
    const loadedMessages: MessageProps[] = [];
    messages.forEach((message) => loadedMessages.push(message));
    loadedMessages.pop();
    loadedMessages.push({
      id: generateId(),
      role: 'bot',
      content: content,
      name: 'Bot',
      isLoading: false,
      avatar: patternflyAvatar,
      actions: {
        // eslint-disable-next-line no-console
        copy: {onClick: () => console.log('Copy')},
      }
    });
    setMessages(loadedMessages);
    // make announcement to assistive devices that new message has loaded
    setAnnouncement(`Message from Bot: API response goes here`);
    setIsSendButtonDisabled(false);
  }

  const {mutate: askQuestion} =
    useDefaultServiceAskAskPost({
      onSuccess: (data: Answer) => {
        updateLastMessage(data.answer, false);
      },
      onError: (error: any) => updateLastMessage(error.message, true),
    });


  // Autu-scrolls to the latest message
  React.useEffect(() => {
    // don't scroll the first load - in this demo, we know we start with two messages
    if (messages.length > 2) {
      scrollToBottomRef.current?.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages]);

  // you will likely want to come up with your own unique id function; this is for demo purposes only
  const generateId = () => {
    const id = Date.now() + Math.random();
    return id.toString();
  };

  const handleSend = (message: string | number) => {
    setIsSendButtonDisabled(true);
    const newMessages: MessageProps[] = [];
    // we can't use structuredClone since messages contains functions, but we can't mutate
    // items that are going into state or the UI won't update correctly
    messages.forEach((message) => newMessages.push(message));
    newMessages.push({
      id: generateId(), role: 'user', content: message as string, name:
        'User', avatar: userAvatar
    });
    newMessages.push({
      id: generateId(),
      role: 'bot',
      content: 'Waiting for answer',
      name: 'Bot',
      isLoading: true,
      avatar: patternflyAvatar
    });
    setMessages(newMessages);
    // make announcement to assistive devices that new messages have been added
    setAnnouncement(`Message from User: ${message}. Message from Bot is loading.`);

    askQuestion({
      requestBody: {
        question: message as string,
      }
    });
  }

  const welcomePrompts = [
    {
      title: 'Example prompt: subscribing to the mailing list',
      message: "How can I subscribe to the mailing list?",
      onClick: () => handleSend( "How can I subscribe to the mailing list?")
    },
    {
      title: 'Example prompt: SSL issues',
      message: "I'm experiencing issues configuring SSL for my broker, can you give me some advice? Has anyone encounter the same kind of issues? List subjects, participants and add dates.",
      onClick: () => handleSend( "I'm experiencing issues configuring SSL for my broker, can you give me some advice? Has anyone encounter the same kind of issues? List subjects, participants and add dates.")
    },
  ];
  return (
    <>
      <Chatbot displayMode={ChatbotDisplayMode.fullscreen}>
        <ChatbotContent>
          {/* Update the announcement prop on MessageBox whenever a new message is sent
                 so that users of assistive devices receive sufficient context  */}
          <MessageBox announcement={announcement}>
            <ChatbotWelcomePrompt
              title="Hello, Chatbot User"
              description="How may I help you today?"
              prompts={welcomePrompts}
            />
            {/* This code block enables scrolling to the top of the last message.
                  You can instead choose to move the div with scrollToBottomRef on it below
                  the map of messages, so that users are forced to scroll to the bottom.
                  If you are using streaming, you will want to take a different approach;
                  see: https://github.com/patternfly/virtual-assistant/issues/201#issuecomment-2400725173 */}
            {messages.map((message, index) => {
              if (index === messages.length - 1) {
                return (
                  <>
                    <div ref={scrollToBottomRef}></div>
                    <Message key={message.id} {...message} />
                  </>
                );
              }
              return <Message key={message.id} {...message} />;
            })}
          </MessageBox>
        </ChatbotContent>
        <ChatbotFooter>
          <MessageBar
            onSendMessage={handleSend}
            hasMicrophoneButton
            isSendButtonDisabled={isSendButtonDisabled}
          />
          <ChatbotFootnote {...footnoteProps} />
        </ChatbotFooter>
      </Chatbot>
    </>
  );
};


const Dashboard: React.FunctionComponent = () => {
  return (
    <PageSection isWidthLimited isCenterAligned>
      <ChatbotDemo />
    </PageSection>
  )
}

export {Dashboard};
