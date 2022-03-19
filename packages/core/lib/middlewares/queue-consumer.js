const queueConsumer = (server) =>
  async function middleware(nullContext, nullSocket, push) {
    server.on('client', async (socket) => {
      try {
        await this.channel.assertQueue(socket.clientId, { durable: false });
        await this.channel.consume(
          socket.clientId,
          (rabbitMessage) => {
            try {
              const packet = {
                type: rabbitMessage.fields.routingKey,
                payload: rabbitMessage.content,
                ...rabbitMessage.properties.headers,
              };
              push({ packet }, socket);
            } catch (error) {
              push(error);
            }
          },
          { noAck: true }
        );
      } catch (error) {
        push(error);
      }
    });
  };

module.exports = queueConsumer;
