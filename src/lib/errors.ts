export class AppError extends Error{constructor(public code:string,message:string,public status=400){super(message)}}
export const apiError=(error:unknown)=>{const e=error instanceof AppError?error:new AppError("INTERNAL_ERROR","Something went wrong.",500);return Response.json({success:false,error:{code:e.code,message:e.message}},{status:e.status})};
