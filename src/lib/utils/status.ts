import type { MembershipStatus,PaymentStatus } from "@prisma/client";
const day=(d:Date)=>Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
export function calculateMembershipStatus(start:Date|null,end:Date|null,now=new Date()):MembershipStatus{if(!start||!end||start>end)return "REVIEW_REQUIRED";const t=day(now);if(day(start)>t)return "UPCOMING";if(day(end)>=t)return "ACTIVE";return "EXPIRED"}
export function calculatePaymentStatus(final:number,paid:number,pending:number,allBlank=false):PaymentStatus{if(allBlank||(!final&&!paid&&!pending))return "UNKNOWN";if(paid>final&&final>=0)return "OVERPAID";if(pending<=0&&final>0)return "PAID";if(paid>0&&pending>0)return "PARTIAL";if(paid===0&&pending>0)return "UNPAID";return "REVIEW_REQUIRED"}
export function daysBetween(from:Date,to:Date){return Math.ceil((day(to)-day(from))/86400000)}
