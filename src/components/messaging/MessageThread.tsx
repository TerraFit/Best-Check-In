import { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';

interface Message {
  id: string;
  sender_type: 'admin' | 'business';
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface Props {
  conversationId: string;
  userType: 'admin' | 'business';
  onMessageSent: () => void;
}

export default function MessageThread({ conversationId, userType, onMessageSent }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversation, setConversation] = useState<any>(null);

  useEffect(() => {
    fetchMessages();
    // Mark messages as read when opening thread
    markAsRead();
    
    // Poll for new messages
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/.netlify/functions/get-messages?conversationId=${conversationId}`);
      const data = await response.json();
      setMessages(data.messages || []);
      setConversation(data.conversation);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch('/.netlify/functions/mark-message-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          readerType: userType
        })
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    setSending(true);
    try {
      const response = await fetch('/.netlify/functions/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          senderType: userType,
          senderName: userType === 'admin' ? 'Support' : 'Business',
          message,
          sendEmail: true
        })
      });

      if (response.ok) {
        await fetchMessages();
        onMessageSent();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Conversation Header */}
      {conversation && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-900">{conversation.subject}</h3>
          {conversation.priority !== 'normal' && (
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
              conversation.priority === 'urgent' ? 'bg-red-100 text-red-800' :
              conversation.priority === 'high' ? 'bg-orange-100 text-orange-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {conversation.priority} priority
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_type === userType}
            showAvatar={index === 0 || messages[index - 1]?.sender_type !== msg.sender_type}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <MessageComposer
        onSend={handleSendMessage}
        disabled={sending}
        placeholder="Type your message here..."
      />
    </div>
  );
}
