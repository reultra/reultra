const packetConsumer = async function packetConsumer(context, push) {
  await this.channel.assertQueue(context.route, { durable: false });
  await this.channel.consume(
    context.route,
    (rabbitMessage) => {
      try {
        context.sender = rabbitMessage.properties.headers.sender;
        context.packet = {
          type: rabbitMessage.properties.type,
          payload: rabbitMessage.content,
        };
        push();
      } catch (error) {
        push(error);
      }
    },
    { noAck: true }
  );
};

module.exports = packetConsumer;
