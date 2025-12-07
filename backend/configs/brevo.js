import brevo from "@getbrevo/brevo";

const client = new brevo.TransactionalEmailsApi();

client.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

export default client;
