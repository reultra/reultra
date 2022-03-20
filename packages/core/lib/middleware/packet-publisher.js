const packetPublisher = async (context, push) => {
  await context.channel.assertQueue(context.route, { durable: false });
  await context.channel.sendToQueue(context.route, context.packet.payload, {
    type: context.packet.type,
    headers: { sender: context.sender },
  });
  push();
};

module.exports = packetPublisher;
