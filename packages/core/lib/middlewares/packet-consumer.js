const packetConsumer = async function packetConsumer(context, push) {
  await this.channel.assertQueue(context.queue, { durable: false });
  await this.channel.consume(
    context.queue,
    (rabbitMessage) => {
      try {
        context.route = rabbitMessage.fields.routingKey;
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
