import * as nodemailer from 'nodemailer';

export async function sendMail(mailOptions: nodemailer.SendMailOptions) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  await transporter.sendMail(mailOptions);
}

// import * as nodemailer from 'nodemailer';

// export async function sendMail(mailOptions: nodemailer.SendMailOptions) {
//   const email = process.env.EMAIL;
//   const password = process.env.PASSWORD;

//   if (!email || !password) {
//     throw new Error('EMAIL or PASSWORD is missing in .env');
//   }

//   const transporter = nodemailer.createTransport({
//     host: 'smtp.gmail.com',
//     port: 465,
//     secure: true,
//     auth: {
//       user: email,
//       pass: password,
//     },
//   });

//   await transporter.verify();

//   return transporter.sendMail({
//     ...mailOptions,
//     from: email,
//   });
// }
