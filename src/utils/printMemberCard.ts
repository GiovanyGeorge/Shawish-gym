import type { MemberProfile } from "@/types/domain";
import { qrSvgMarkup } from "@/utils/qrSvg";
import { escapeHtml, printHtml } from "@/utils/printHtml";
import { formatDate } from "@/utils/dates";

export function printMemberCard(opts: {
  profile: MemberProfile;
  gymName: string;
  photoUrl?: string | null;
  logoUrl?: string | null;
}): void {
  const { profile, gymName, photoUrl, logoUrl } = opts;
  const qr = qrSvgMarkup(profile.member_code, 110);
  const status = profile.display_status.replace(/_/g, " ");
  const photo = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #ddd" />`
    : `<div style="width:72px;height:72px;border-radius:8px;background:#f3f3f3;display:flex;align-items:center;justify-content:center;font-weight:700;color:#ea580c">${escapeHtml(profile.name.slice(0, 1))}</div>`;
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="" style="height:28px;object-fit:contain" />`
    : "";

  printHtml(
    `Member card · ${profile.member_code}`,
    `<div style="width:86mm;min-height:54mm;border:1px solid #ddd;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <p style="font-size:11px;letter-spacing:.18em;color:#ea580c;font-weight:700">${escapeHtml(gymName.toUpperCase())}</p>
          <p class="muted">Member Card</p>
        </div>
        ${logo}
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        ${photo}
        <div>
          <h2 style="font-size:16px">${escapeHtml(profile.name)}</h2>
          <p style="margin-top:4px;font-size:13px;letter-spacing:.08em;font-weight:700">${escapeHtml(profile.member_code)}</p>
          <p class="muted" style="margin-top:4px;text-transform:capitalize">${escapeHtml(status)}</p>
          <p class="muted">Valid until ${escapeHtml(formatDate(profile.current_subscription?.end_date))}</p>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end">${qr}</div>
    </div>`,
  );
}
