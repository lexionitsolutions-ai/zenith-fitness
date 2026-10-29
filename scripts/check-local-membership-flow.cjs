// HTTP smoke test against localhost. Uses one marked synthetic signup and
// removes only that fixture in finally. Never initiates UPI or opens WhatsApp.
require('@next/env').loadEnvConfig(process.cwd(), !process.argv.includes('--production'));
const assert = require('node:assert/strict');
const {randomBytes,randomUUID} = require('node:crypto');
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient({datasources:{db:{url:process.env.DIRECT_URL || process.env.DATABASE_URL}}});
const origin = process.env.ZENITH_TEST_ORIGIN || 'http://localhost:3000';
if (!['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('This check is restricted to localhost.');
const marker = `Checkout QA ${randomUUID()}`;
const mobile = '9'+String(Math.floor(Math.random()*1e9)).padStart(9,'0');
let cookie = '';
function remember(response) {
  const value = response.headers.getSetCookie().find(v=>v.startsWith('zenith_session='));
  if (value) cookie=value.split(';')[0];
}
async function request(path, method='GET', body, extra={}) {
  const response = await fetch(origin+path,{method,redirect:'manual',signal:AbortSignal.timeout(60000),headers:{...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
  remember(response); return response;
}
async function json(path,method,body) {
  const response=await request(path,method,body);
  const data=await response.json();
  assert.equal(response.status<400,true,`${path}: ${data.error?.code ?? response.status}`);
  return data;
}
async function main() {
  try {
    for (const logo of ['google-pay','phonepe','paytm']) {
      const response=await request(`/brand/payments/${logo}.svg`);
      assert.equal(response.status,200,`${logo} asset must be served by localhost`);
      assert.ok((await response.text()).includes('<svg'));
    }
    const password=randomBytes(20).toString('hex');
    await json('/api/auth/register','POST',{name:marker,mobile,gender:'Female',password,confirmPassword:password});
    assert.ok(cookie.startsWith('zenith_session='));
    assert.equal((await request('/dashboard')).status,200);
    const before=cookie;
    const prefetch=await request('/api/auth/logout?next=/login','GET',undefined,{'next-router-prefetch':'1',purpose:'prefetch'});
    assert.equal(prefetch.headers.get('set-cookie'),null,'GET logout must never delete a session');
    assert.equal(cookie,before);
    assert.equal((await request('/dashboard')).status,200,'session survives a logout-link prefetch');
    await json('/api/member/applicant-profile','POST',{address:'Temporary checkout QA locality',birthDate:'1995-01-01'});
    let selected=await json('/api/member/membership','POST',{planCode:'FEMALE_3'});
    assert.ok(selected.data.checkoutUrl.startsWith('/membership/checkout/'));
    const plans=await (await request('/membership')).text();
    assert.ok(plans.includes('Explore other plans'));
    assert.ok(plans.includes('Switch to this plan'));
    const originalId=selected.data.orderId;
    const switched=await json('/api/member/membership','POST',{planCode:'FEMALE_6',replaceExisting:true});
    assert.notEqual(switched.data.orderId,originalId);
    const overview=await json('/api/member/membership','GET');
    assert.equal(overview.data.orders.find(order=>order.id===originalId).status,'CANCELLED');
    assert.equal(overview.data.orders.find(order=>order.id===switched.data.orderId).amountDue,5699);
    selected=await json('/api/member/membership','POST',{planCode:'FEMALE_3',replaceExisting:true});
    const checkout=await request(selected.data.checkoutUrl);
    assert.equal(checkout.status,200);
    const html=await checkout.text();
    for (const name of ['google-pay.svg','phonepe.svg','paytm.svg','I have paid']) assert.ok(html.includes(name),`${name} must appear in checkout HTML`);
    assert.ok(!html.includes('Amount actually paid'),'the new flow must not ask for an amount');
    const utr=String(Math.floor(1e11+Math.random()*9e11));
    const submitted=await json('/api/member/membership','PATCH',{id:selected.data.orderId,action:'submit',utr});
    const url=new URL(submitted.data.whatsappUrl);
    assert.equal(url.origin+url.pathname,'https://wa.me/918999699811');
    const message=url.searchParams.get('text');
    for (const text of ['Hey Zenith Fitness,','Duration: 3 months','Amount paid: Rs. 3,999',`UTR: ${utr}`,'Please approve my admission.']) assert.ok(message.includes(text));
    const repeated=await json('/api/member/membership','PATCH',{id:selected.data.orderId,action:'submit',utr});
    assert.equal(repeated.data.whatsappUrl,submitted.data.whatsappUrl);
    assert.equal((await request('/dashboard')).status,200);
    assert.equal((await request(selected.data.checkoutUrl)).status,200);
    console.log('PASS: logos, session persistence, visible alternative plans, unpaid plan switching, updated prices, separate checkout, UTR-only submission, duplicate retry and WhatsApp draft. No UPI payment or WhatsApp message was sent.');
  } finally {
    const fixture=await db.user.findUnique({where:{mobileNumber:'+91'+mobile},select:{id:true,displayName:true,memberId:true}});
    if (fixture && fixture.displayName===marker && fixture.memberId===null) {
      await db.$transaction(async tx=>{
        await tx.membershipOrder.deleteMany({where:{userId:fixture.id}});
        await tx.user.delete({where:{id:fixture.id}});
      });
      console.log('Removed the synthetic QA account and its checkout records.');
    }
    await db.$disconnect();
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
