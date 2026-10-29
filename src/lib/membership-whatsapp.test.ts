import { describe, expect, it } from "vitest";
import { membershipWhatsAppUrl } from "./membership-whatsapp";
const person = { name: "Test Member", mobile: "+919876500001" };
const order = { id:"order-id",kind:"ADMISSION",planName:"3 Months · Male",durationMonths:3,amountDue:4699,reportedAmount:null,pointsUsed:0,utr:"123456789012" };
describe("membership WhatsApp draft", () => {
  it("prefills the correct admission, plan, amount and UTR for the requested number", () => {
    const url = new URL(membershipWhatsAppUrl(person, order));
    expect(url.origin + url.pathname).toBe("https://wa.me/918999699811");
    const message = url.searchParams.get("text");
    expect(message).toContain("Hey Zenith Fitness,");
    expect(message).toContain("Duration: 3 months");
    expect(message).toContain("Amount paid: Rs. 4,699");
    expect(message).toContain("UTR: 123456789012");
    expect(message).toContain("Please approve my admission.");
  });
  it("uses renewal wording and the discounted amount for renewals", () => {
    const message = new URL(membershipWhatsAppUrl(person,{...order,kind:"RENEWAL",pointsUsed:300,amountDue:4399,reportedAmount:4399})).searchParams.get("text");
    expect(message).toContain("Amount paid: Rs. 4,399");
    expect(message).toContain("Points discount: Rs. 300 (300 points)");
    expect(message).toContain("Please approve my renewal.");
    expect(message).not.toContain("Please approve my admission.");
  });
});
