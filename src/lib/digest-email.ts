import {
  cleanDaysThisRun,
  nextMilestones,
  parseDate,
  todayInTz,
  weeklySupportProgress,
} from "./journey";
import { offeredPodcasts, formatDuration } from "./podcasts";
import { normalizeFund } from "./fund";
import { reminderLink, type ReminderKind } from "./reminders";
import type { RebuildState, Reward } from "./types";

export type DigestContent = {
  subject: string;
  html: string;
  text: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

function weekdayName(date: string): string {
  return parseDate(date).toLocaleDateString("en-US", { weekday: "long" });
}

function firstOpenReward(state: RebuildState): Reward | undefined {
  return state.rewards.find((r) => !r.executed);
}

function progressRow(label: string, done: number, target: number): string {
  const pct =
    target <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((done / target) * 100)));
  const fill =
    pct <= 0
      ? ""
      : `<table role="presentation" width="${pct}%" cellspacing="0" cellpadding="0" style="width:${pct}%;max-width:${pct}%;">
            <tr><td style="height:6px;line-height:6px;font-size:0;background:#1f6b4a;border-radius:999px;">&nbsp;</td></tr>
          </table>`;
  return `
    <tr>
      <td style="padding:10px 0 12px;border-bottom:1px solid #e4ddd0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-family:Georgia,serif;font-size:15px;color:#0f1c18;"><strong>${esc(label)}</strong></td>
            <td align="right" style="font-family:Georgia,serif;font-size:13px;color:#5a6b63;white-space:nowrap;">${done} / ${target} this week</td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;">
          <tr>
            <td style="background:#e4ddd0;border-radius:999px;height:6px;line-height:6px;font-size:0;">
              ${fill || "&nbsp;"}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function wrapCard(inner: string): string {
  return `<div style="margin:0;padding:0;background:#f4f1ea;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ea;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#fbfaf6;border:1px solid #e4ddd0;border-radius:16px;">
          ${inner}
          <tr>
            <td style="padding:0 28px 24px;font-family:Georgia,serif;font-size:12px;color:#5a6b63;">
              This mailbox isn’t monitored.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`;
}

function kicker(date: string): string {
  return `<tr>
            <td style="padding:16px 28px 4px;font-family:Georgia,serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#5a6b63;">
              JeremyOS · ${esc(weekdayName(date))}
            </td>
          </tr>`;
}

function heading(title: string): string {
  return `<tr>
            <td style="padding:0 28px 8px;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:#0f1c18;">
              ${esc(title)}
            </td>
          </tr>`;
}

function body(html: string): string {
  return `<tr>
            <td style="padding:0 28px 20px;font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#3d4a45;">
              ${html}
            </td>
          </tr>`;
}

function sectionLabel(label: string): string {
  return `<tr>
            <td style="padding:0 28px 8px;font-family:Georgia,serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5a6b63;">
              ${esc(label)}
            </td>
          </tr>`;
}

function sectionText(html: string, extraPad = "18px"): string {
  return `<tr>
            <td style="padding:0 28px ${extraPad};font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#0f1c18;">
              ${html}
            </td>
          </tr>`;
}

function cta(href: string, label: string): string {
  return `<tr>
            <td style="padding:0 28px 28px;">
              <a href="${esc(href)}" style="display:inline-block;background:#1f6b4a;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:10px;font-family:Georgia,serif;font-size:16px;font-weight:600;">${esc(label)}</a>
            </td>
          </tr>`;
}

function runCopy(state: RebuildState, date: string): {
  days: number;
  html: string;
  text: string;
} {
  const days = cleanDaysThisRun(state, date);
  const next = nextMilestones(days, 1)[0];
  let html = `<strong>${days} day${days === 1 ? "" : "s"}</strong> this run.`;
  let text = `${days} day${days === 1 ? "" : "s"} this run.`;
  if (next) {
    const left = next.dayNumber - days;
    const when =
      left <= 0
        ? "today"
        : left === 1
          ? "one more morning"
          : `${left} more mornings like this`;
    html += `<br />Next milestone: ${esc(next.title)} (Day ${next.dayNumber}). ${esc(when === "today" ? "Today." : when.charAt(0).toUpperCase() + when.slice(1) + ".")}`;
    text += ` Next milestone: ${next.title} (Day ${next.dayNumber}).`;
  }
  return { days, html, text };
}

function treatBlock(
  state: RebuildState,
  moneyUrl: string,
): { html: string; text: string; amount: number } {
  const treat = normalizeFund(state.fund).treat;
  const target = firstOpenReward(state);
  let html = `${money(treat)}`;
  let follow: string;
  let text: string;
  if (target) {
    const gap = Math.max(0, Math.round((target.estimatedCost - treat) * 100) / 100);
    follow =
      gap <= 0
        ? `You’re pointed at <strong>${esc(target.name)}</strong> (${money(target.estimatedCost)}). Treat Yourself already covers it — or <a href="${esc(moneyUrl)}" style="color:#1f6b4a;">choose what you’re saving for</a>.`
        : `You’re pointed at <strong>${esc(target.name)}</strong> (${money(target.estimatedCost)}). ${money(gap)} more from staying the course — or <a href="${esc(moneyUrl)}" style="color:#1f6b4a;">choose what you’re saving for</a>.`;
    text = `Treat Yourself ${money(treat)}. Pointed at ${target.name} (${money(target.estimatedCost)}). ${moneyUrl}`;
  } else {
    follow = `Nothing named yet — <a href="${esc(moneyUrl)}" style="color:#1f6b4a;">choose what you’re saving for</a>.`;
    text = `Treat Yourself ${money(treat)}. Choose what you’re saving for: ${moneyUrl}`;
  }
  return {
    amount: treat,
    html: `${sectionLabel("Treat Yourself")}
          <tr>
            <td style="padding:0 28px 8px;font-family:Georgia,serif;font-size:32px;line-height:1;color:#1f6b4a;">
              ${esc(html)}
            </td>
          </tr>
          ${sectionText(follow)}`,
    text,
  };
}

function supportBars(state: RebuildState, date: string): {
  html: string;
  text: string;
} {
  const week = weeklySupportProgress(state, date);
  if (week.length === 0) {
    return { html: "", text: "" };
  }
  const rows = week.map((w) => progressRow(w.label, w.done, w.target)).join("");
  const text = week
    .map((w) => `${w.label} ${w.done} / ${w.target} this week`)
    .join("\n");
  return {
    html: `<tr>
            <td style="padding:0 28px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${rows}
              </table>
            </td>
          </tr>`,
    text,
  };
}

function podcastBlock(state: RebuildState): { html: string; text: string } {
  const offers = offeredPodcasts(state.listenedPodcasts);
  if (offers.length === 0) {
    return { html: "", text: "" };
  }
  const articleCount = offers.filter((item) => item.kind === "article").length;
  const podcastCount = offers.length - articleCount;
  const label =
    articleCount > 0
      ? `Recovery content · ${podcastCount} to play · ${articleCount} to read`
      : `Recovery content · ${offers.length} to play`;
  const links = offers
    .map((ep) => {
      const verb = ep.kind === "article" ? "Read" : "Play";
      return `<a href="${esc(ep.url)}" style="color:#1f6b4a;text-decoration:none;"><strong>${esc(ep.show)}</strong> — ${esc(ep.title)}</a> · ${esc(verb)} · ${esc(formatDuration(ep.durationMin))}`;
    })
    .join("<br />");
  const text = offers
    .map((ep) => `${ep.show} — ${ep.title} ${ep.url}`)
    .join("\n");
  return {
    html: `${sectionLabel(label)}${sectionText(links, "22px")}`,
    text: `Recovery content\n${text}`,
  };
}

export function buildMorningDigest(
  state: RebuildState,
  date?: string,
): DigestContent {
  const day = date ?? todayInTz(state.profile?.timezone);
  const name = state.profile?.displayName?.trim() || "there";
  const startUrl = reminderLink("morning");
  const moneyUrl = `${startUrl.replace(/\/morning$/, "")}/money`;
  const run = runCopy(state, day);
  const bars = supportBars(state, day);
  const treat = treatBlock(state, moneyUrl);
  const pods = podcastBlock(state);

  const subject = `Day ${run.days} is waiting`;
  const html = wrapCard(
    `${kicker(day)}
     ${heading(subject)}
     ${body(`Good morning, ${esc(name)}. Keep this run alive — Start the day is still open.`)}
     ${sectionLabel("This run")}
     ${sectionText(run.html)}
     ${sectionLabel("Today")}
     ${sectionText("Start the day still open.", "10px")}
     ${bars.html}
     ${treat.html}
     ${pods.html}
     ${cta(startUrl, `Start the day — keep Day ${run.days}`)}`,
  );
  const text = [
    subject,
    "",
    `Good morning, ${name}. Keep this run alive — Start the day is still open.`,
    "",
    "THIS RUN",
    run.text,
    "",
    "TODAY",
    "Start the day still open.",
    bars.text,
    "",
    treat.text,
    "",
    pods.text,
    "",
    startUrl,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { subject, html, text };
}

export function buildEveningDigest(
  state: RebuildState,
  date?: string,
): DigestContent {
  const day = date ?? todayInTz(state.profile?.timezone);
  const name = state.profile?.displayName?.trim() || "there";
  const closeUrl = reminderLink("evening");
  const moneyUrl = `${closeUrl.replace(/\/evening$/, "")}/money`;
  const run = runCopy(state, day);
  const bars = supportBars(state, day);
  const treat = treatBlock(state, moneyUrl);
  const morning = state.mornings.find((m) => m.date === day);
  const alreadyClosed = state.evenings.some((e) => e.date === day);

  const subject = `Close Day ${run.days}`;
  const lookBack = alreadyClosed
    ? `You already closed today — this is a look back.`
    : `This is your chance to look back on the day. Don’t forget to close it.`;
  const intention = morning
    ? morning.intention?.trim()
      ? `You started with "${esc(morning.intention.trim())}."`
      : `You already started the day.`
    : `Start the day is still open, if you want a quick check-in before you close.`;

  const html = wrapCard(
    `${kicker(day)}
     ${heading(subject)}
     ${body(`Hey ${esc(name)}. ${esc(lookBack)}`)}
     ${sectionLabel("Look back")}
     ${sectionText(intention)}
     ${sectionLabel("This run")}
     ${sectionText(run.html)}
     ${sectionLabel("This week")}
     ${sectionText("How the week is sitting as you close.", "10px")}
     ${bars.html}
     ${treat.html}
     ${cta(closeUrl, alreadyClosed ? "Open tonight’s close" : "Close the day")}`,
  );

  const text = [
    subject,
    "",
    `Hey ${name}. ${lookBack}`,
    "",
    morning
      ? morning.intention?.trim()
        ? `You started with "${morning.intention.trim()}."`
        : "You already started the day."
      : "Start the day is still open.",
    "",
    "THIS RUN",
    run.text,
    "",
    "THIS WEEK",
    bars.text,
    "",
    treat.text,
    "",
    closeUrl,
  ].join("\n");

  return { subject, html, text };
}

export function buildReminderDigest(
  kind: ReminderKind,
  state: RebuildState,
  date?: string,
): DigestContent {
  return kind === "morning"
    ? buildMorningDigest(state, date)
    : buildEveningDigest(state, date);
}
