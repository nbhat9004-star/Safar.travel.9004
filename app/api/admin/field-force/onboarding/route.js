import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getCollection } from '@/lib/db';
import { getCurrentUser, requireRole, hashPassword } from '@/lib/auth';
const json=(data,status=200)=>NextResponse.json(data,{status});
export async function GET(request){const me=await getCurrentUser(request);const auth=requireRole(me,['super_admin','admin']);if(!auth.ok)return json({ok:false,error:auth.error},auth.status);const url=new URL(request.url);const status=url.searchParams.get('status')||'pending';const filter=status==='all'?{}:{status};const rows=await (await getCollection('hostOnboardingApplications')).find(filter,{projection:{_id:0}}).sort({createdAt:-1}).limit(300).toArray();return json({ok:true,applications:rows});}
export async function PATCH(request){const me=await getCurrentUser(request);const auth=requireRole(me,['super_admin']);if(!auth.ok)return json({ok:false,error:auth.error},auth.status);const b=await request.json().catch(()=>({}));if(!b.id||!['approved','rejected'].includes(b.status))return json({ok:false,error:'Application id and approved/rejected status required.'},400);const apps=await getCollection('hostOnboardingApplications');const app=await apps.findOne({id:b.id});if(!app)return json({ok:false,error:'Application not found.'},404);if(app.status!=='pending')return json({ok:false,error:'Only pending applications can be reviewed.'},409);
 let hostId=app.hostId||null;
 if(b.status==='approved'){
  const users=await getCollection('users');const email=String(app.email||'').trim().toLowerCase();
  let host=email?await users.findOne({email}):null;
  if(host&&host.role!=='host')return json({ok:false,error:'This email already belongs to an existing account. Resolve the account conflict before approval.'},409);
  if(!host){if(!email)return json({ok:false,error:'A host email is required before approval.'},400);const crypto=await import('crypto');const resetToken=crypto.randomBytes(32).toString('hex');host={id:uuid(),name:app.hostName,email,phone:app.phone,role:'host',emailVerified:true,hostApplicationStatus:'approved',passwordHash:await hashPassword(crypto.randomBytes(24).toString('hex')),resetToken,resetTokenExpiry:new Date(Date.now()+24*60*60*1000),createdAt:new Date(),updatedAt:new Date(),createdFromEmployeeApplication:app.id};await users.insertOne(host);hostId=host.id;
   try{const {sendPasswordResetEmail}=await import('@/lib/email');const link=`${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password?token=${resetToken}`;await sendPasswordResetEmail(host,link);}catch(e){console.error('Host onboarding password email failed',e);}
  }else{hostId=host.id;await users.updateOne({id:host.id},{$set:{hostApplicationStatus:'approved',updatedAt:new Date()}});}
  const listings=await getCollection('listings');
  const existingListing=await listings.findOne({onboardingApplicationId:app.id});
  if(!existingListing){
   const listingNow=new Date();
   await listings.insertOne({id:uuid(),title:app.businessName,description:app.description,category:app.businessType,subcategory:null,location:app.address,price:Number(app.price),images:[],hostId,hostName:app.hostName,hostAvatar:null,superhost:false,amenities:[],services:[],duration:null,badge:null,rating:0,reviews:0,status:'approved',featured:false,isDemo:false,inventoryTypes:[],categoryDetails:{},onboardingApplicationId:app.id,createdByEmployeeId:app.employeeId,createdAt:listingNow,updatedAt:listingNow});
  }
 }
 const now=new Date();await apps.updateOne({id:app.id,status:'pending'},{$set:{status:b.status,reviewedBy:me.id,reviewedByName:me.name||me.email,reviewedAt:now,reviewNotes:String(b.reviewNotes||'').slice(0,1500),hostId,updatedAt:now}});
 try{await (await getCollection('notifications')).insertOne({id:uuid(),userId:app.employeeId,type:'host_onboarding_'+b.status,category:'system',title:b.status==='approved'?'Host application approved':'Host application needs changes',body:b.status==='approved'?`${app.businessName} was approved. Host account setup has been initiated.`:String(b.reviewNotes||'Please contact your manager.'),link:'/field-force',meta:{applicationId:app.id},read:false,createdAt:now});}catch(e){console.error('Employee notification failed',e);}
 return json({ok:true,status:b.status,hostId});
}
