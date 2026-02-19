import MessageInbox from '../../components/messaging/MessageInbox';

export default function BusinessMessages() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>
        <MessageInbox userType="business" />
      </div>
    </div>
  );
}
