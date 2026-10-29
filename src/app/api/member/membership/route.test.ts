import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/authorize",()=>({requireActiveRole:vi.fn()}));
vi.mock("@/services/membership-purchase.service",()=>({createMembershipOrder:vi.fn(),purchaseOverview:vi.fn(),updateMembershipOrder:vi.fn()}));
import { requireActiveRole } from "@/lib/auth/authorize";
import { createMembershipOrder, purchaseOverview, updateMembershipOrder } from "@/services/membership-purchase.service";
import { POST, PATCH } from "./route";
const id = "a0000000-0000-4000-8000-000000000001";
const request = (body:object,method:string) => new Request("http://localhost/api/member/membership",{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();vi.mocked(requireActiveRole).mockResolvedValue({userId:"user",memberId:null,role:"MEMBER"});});
describe("membership checkout navigation",()=>{
  it("returns a separate payment page after selecting a plan",async()=>{
    vi.mocked(createMembershipOrder).mockResolvedValue({id} as Awaited<ReturnType<typeof createMembershipOrder>>);
    const response = await POST(request({planCode:"MALE_1"},"POST"));
    expect(await response.json()).toMatchObject({data:{orderId:id,checkoutUrl:`/membership/checkout/${id}`}});
  });
  it("forwards an explicit request to replace an unpaid plan",async()=>{
    vi.mocked(createMembershipOrder).mockResolvedValue({id} as Awaited<ReturnType<typeof createMembershipOrder>>);
    const response=await POST(request({planCode:"FEMALE_6",replaceExisting:true},"POST"));
    expect(response.status).toBe(200);
    expect(createMembershipOrder).toHaveBeenCalledWith("user","FEMALE_6",true);
  });
  it("accepts just the UTR and returns a saved WhatsApp request",async()=>{
    const whatsappUrl="https://wa.me/918999699811?text=test";
    vi.mocked(updateMembershipOrder).mockResolvedValue({id} as Awaited<ReturnType<typeof updateMembershipOrder>>);
    vi.mocked(purchaseOverview).mockResolvedValue({orders:[{id,whatsappUrl}]} as Awaited<ReturnType<typeof purchaseOverview>>);
    const response = await PATCH(request({id,action:"submit",utr:"123456789012"},"PATCH"));
    expect(response.status).toBe(200);
    expect(updateMembershipOrder).toHaveBeenCalledWith("user",id,{id,action:"submit",utr:"123456789012"});
    expect(await response.json()).toMatchObject({data:{whatsappUrl}});
  });
});
