export const runtime='nodejs';
export async function GET(){return Response.json({ready:!!process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||'gpt-5.4-mini'},{headers:{'Cache-Control':'no-store'}});}
