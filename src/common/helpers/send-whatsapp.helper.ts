import { Channels } from '@vonage/messages';
import { Vonage } from '@vonage/server-sdk';

export async function sendSms(to: string, otp: string) {
  const vonage = new Vonage({
    apiKey: process.env.VONAGE_API_KEY!,
    apiSecret: process.env.VONAGE_API_SECRET!,
  });

  const phone = to.replace(/^\+/, '');

  await vonage.messages.send({
    messageType: 'text',
    channel: Channels.SMS,
    text: `Your verification code is ${otp}`,
    to: phone,
    from: process.env.VONAGE_SENDER!,
  });
}