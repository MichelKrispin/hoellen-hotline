import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const directory = new URL(
  "../src/assets/source/placeholders/",
  import.meta.url,
);
mkdirSync(directory, { recursive: true });

const sprites = {
  "hellscape-backdrop": [
    1920,
    780,
    `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#241827"/><stop offset=".64" stop-color="#672d32"/><stop offset="1" stop-color="#c24729"/></linearGradient><radialGradient id="glow"><stop stop-color="#ff8b3b" stop-opacity=".58"/><stop offset="1" stop-color="#ff8b3b" stop-opacity="0"/></radialGradient></defs><rect width="1920" height="780" fill="url(#sky)"/><ellipse cx="960" cy="560" rx="860" ry="350" fill="url(#glow)"/><path d="M0 620L80 420l95 200 120-290 100 290 160-220 130 220 180-310 150 310 190-245 130 245 160-300 180 300 160-200 140 200V780H0" fill="#4a232a" opacity=".65"/>`,
  ],
  "hellscape-city": [
    1920,
    470,
    `<path d="M0 470V180h76V110h36v70h80V58h104v122h51V91h110v89h65V0h93v180h79V85h72v95h81V23h117v157h65V107h99v73h84V47h112v133h70V98h94v82h78V29h121v151h85V66h94v114h84V470Z" fill="#281b28"/><path d="M0 470V245h106V130h51v115h96V167h90v78h108V107h96v138h75V160h121v85h86V129h116v116h94V176h120v69h88V105h94v140h112V155h100v90h100V470Z" fill="#17141e"/><g fill="#ef6639" opacity=".65"><path d="M65 220h12v18H65zm190 0h12v18h-12zm231-72h12v18h-12zm151 152h12v18h-12zm261-84h12v18h-12zm324-32h12v18h-12zm361 40h12v18h-12zm177-100h12v18h-12z"/></g>`,
  ],
  bridge: [
    1920,
    320,
    `<path d="M0 150 1920 228v92H0Z" fill="#120f19"/><path d="M0 35 1920 117" stroke="#231923" stroke-width="22"/><path d="M0 49 1920 131" stroke="#96503d" stroke-width="5"/><path d="M0 117 1920 199" stroke="#231923" stroke-width="18"/><path d="M0 125 1920 207" stroke="#96503d" stroke-width="4"/><path d="M0 142 1920 220" stroke="#17121c" stroke-width="28"/><g fill="#ef6c3b"><circle cx="95" cy="145" r="5"/><circle cx="395" cy="157" r="5"/><circle cx="695" cy="169" r="5"/><circle cx="995" cy="181" r="5"/><circle cx="1295" cy="193" r="5"/><circle cx="1595" cy="205" r="5"/></g>`,
  ],
  pipe: [
    96,
    600,
    `<rect x="22" y="0" width="48" height="600" rx="16" fill="#281e29" stroke="#805047" stroke-width="6"/><path d="M38 10v580" stroke="#b0785d" stroke-opacity=".45" stroke-width="6"/><rect x="8" y="43" width="80" height="35" rx="10" fill="#493039" stroke="#986452" stroke-width="4"/><rect x="8" y="487" width="80" height="35" rx="10" fill="#493039" stroke="#986452" stroke-width="4"/>`,
  ],
  chain: [
    50,
    240,
    `<g fill="none" stroke="#261d2a" stroke-width="8"><ellipse cx="25" cy="20" rx="12" ry="22"/><ellipse cx="25" cy="60" rx="12" ry="22"/><ellipse cx="25" cy="100" rx="12" ry="22"/><ellipse cx="25" cy="140" rx="12" ry="22"/><ellipse cx="25" cy="180" rx="12" ry="22"/><ellipse cx="25" cy="220" rx="12" ry="22"/></g><circle cx="25" cy="237" r="7" fill="#e65e38"/>`,
  ],
  ember: [
    18,
    18,
    `<circle cx="9" cy="9" r="8" fill="#fa6f3a" opacity=".38"/><circle cx="9" cy="9" r="3" fill="#ffe0a1"/>`,
  ],
  "desk-wood": [
    1920,
    210,
    `<rect width="1920" height="210" fill="#58382f"/><path d="M0 8h1920M0 148h1920" stroke="#291c25" stroke-width="14"/><path d="M0 30h1920" stroke="#b1704c" stroke-opacity=".65" stroke-width="5"/><path d="m30 25 90 180m82-180 90 180m82-180 90 180m82-180 90 180m82-180 90 180m82-180 90 180m82-180 90 180m82-180 90 180m82-180 90 180m82-180 90 180m82-180 90 180m82-180 90 180" stroke="#a46448" stroke-opacity=".2" stroke-width="4"/>`,
  ],
  "panel-metal": [
    256,
    256,
    `<rect x="8" y="12" width="240" height="236" rx="19" fill="#100e17" opacity=".65"/><rect x="4" y="4" width="240" height="236" rx="19" fill="#33272f" stroke="#9d6a59" stroke-width="5"/><path d="M28 19h190" stroke="#c49879" opacity=".45" stroke-width="3"/><g fill="#211923" stroke="#ae7d66" stroke-width="3"><circle cx="25" cy="25" r="7"/><circle cx="223" cy="25" r="7"/><circle cx="25" cy="219" r="7"/><circle cx="223" cy="219" r="7"/></g>`,
  ],
  "panel-wood": [
    256,
    256,
    `<rect x="8" y="12" width="240" height="236" rx="16" fill="#100e17" opacity=".65"/><rect x="4" y="4" width="240" height="236" rx="16" fill="#624032" stroke="#ad7050" stroke-width="5"/><path d="M16 65h223M16 178h223" stroke="#33212a" stroke-width="5"/><path d="M28 19h190" stroke="#d09263" opacity=".45" stroke-width="3"/><g fill="#211923" stroke="#ae7d66" stroke-width="3"><circle cx="25" cy="25" r="7"/><circle cx="223" cy="25" r="7"/><circle cx="25" cy="219" r="7"/><circle cx="223" cy="219" r="7"/></g>`,
  ],
  "panel-bakelite": [
    256,
    256,
    `<rect x="8" y="12" width="240" height="236" rx="23" fill="#100e17" opacity=".65"/><rect x="4" y="4" width="240" height="236" rx="23" fill="#251d28" stroke="#7e5d56" stroke-width="5"/><path d="M25 18h194" stroke="#a78076" opacity=".3" stroke-width="4"/><g fill="#14101b" stroke="#936d60" stroke-width="3"><circle cx="25" cy="25" r="7"/><circle cx="223" cy="25" r="7"/><circle cx="25" cy="219" r="7"/><circle cx="223" cy="219" r="7"/></g>`,
  ],
  "panel-paper": [
    256,
    256,
    `<rect x="8" y="12" width="240" height="236" rx="8" fill="#100e17" opacity=".45"/><rect x="4" y="4" width="240" height="236" rx="8" fill="#ead2a4" stroke="#a57b59" stroke-width="4"/><path d="M215 5v31h28" fill="#d9b788" stroke="#ad8060" stroke-width="3"/><path d="M25 42h181M25 60h181M25 78h181" stroke="#b99572" stroke-opacity=".35" stroke-width="3"/>`,
  ],
  "paper-sheet": [
    240,
    320,
    `<rect x="9" y="11" width="222" height="299" rx="8" fill="#130d17" opacity=".45"/><rect x="4" y="4" width="222" height="299" rx="8" fill="#ead2a4" stroke="#a17859" stroke-width="4"/><path d="M175 5v52h50" fill="#d6b184" stroke="#a17859" stroke-width="3"/><rect x="86" y="1" width="68" height="18" rx="5" fill="#755049" stroke="#bb9874" stroke-width="3"/><path d="M24 82h175M24 114h175M24 146h175M24 178h175M24 210h175M24 242h175" stroke="#a57b61" stroke-opacity=".34" stroke-width="3"/>`,
  ],
  "neon-frame": [
    320,
    90,
    `<rect x="8" y="8" width="304" height="74" rx="15" fill="#211925" stroke="#a9775d" stroke-width="5"/><rect x="15" y="15" width="290" height="60" rx="10" fill="#fff" fill-opacity=".06" stroke="#fff" stroke-width="5"/><rect x="20" y="20" width="280" height="50" rx="8" fill="#fff" fill-opacity=".08"/>`,
  ],
  "gauge-face": [
    160,
    160,
    `<circle cx="80" cy="80" r="75" fill="#161019" stroke="#9e705a" stroke-width="9"/><circle cx="80" cy="80" r="61" fill="#ead4a9" stroke="#805f52" stroke-width="3"/><g stroke="#513a3d" stroke-width="4"><path d="m30 116 14-8m-9-42 16 5m18-34 5 16m39-14-7 16m32 36-17 3m1 39-14-10"/></g><circle cx="80" cy="80" r="8" fill="#56383c"/>`,
  ],
  "gauge-needle": [
    160,
    160,
    `<path d="M80 80 34 36 75 87Z" fill="#b12e37" stroke="#5f2733" stroke-width="3"/><circle cx="80" cy="80" r="9" fill="#56383c"/>`,
  ],
  telephone: [
    320,
    150,
    `<ellipse cx="160" cy="132" rx="151" ry="16" fill="#130e17" opacity=".6"/><rect x="27" y="62" width="266" height="75" rx="23" fill="#251d28" stroke="#94716a" stroke-width="7"/><rect x="35" y="20" width="250" height="39" rx="18" fill="#16121d" stroke="#c34839" stroke-width="7"/><circle cx="160" cy="98" r="25" fill="#e76535"/><circle cx="160" cy="98" r="11" fill="#17121e"/><g fill="#b49a83"><circle cx="72" cy="101" r="11"/><circle cx="248" cy="101" r="11"/></g><path d="M286 94c37-16 37 25 9 32" fill="none" stroke="#251d28" stroke-width="8"/>`,
  ],
  "filing-cabinet": [
    420,
    560,
    `<rect x="16" y="12" width="388" height="534" rx="14" fill="#54362e" stroke="#a76f4e" stroke-width="9"/><g fill="#34242b" stroke="#a16e53" stroke-width="6"><rect x="38" y="45" width="344" height="109" rx="8"/><rect x="38" y="170" width="344" height="109" rx="8"/><rect x="38" y="295" width="344" height="109" rx="8"/><rect x="38" y="420" width="344" height="109" rx="8"/></g><g fill="#bd966b"><rect x="172" y="90" width="76" height="20" rx="8"/><rect x="172" y="215" width="76" height="20" rx="8"/><rect x="172" y="340" width="76" height="20" rx="8"/><rect x="172" y="465" width="76" height="20" rx="8"/></g>`,
  ],
  "archive-stack": [
    280,
    280,
    `<g stroke="#a77b5d" stroke-width="4"><rect x="23" y="216" width="237" height="34" rx="5" fill="#38252b"/><rect x="32" y="179" width="228" height="34" rx="5" fill="#39252b"/><rect x="18" y="142" width="238" height="34" rx="5" fill="#38252b"/><rect x="30" y="105" width="230" height="34" rx="5" fill="#39252b"/><rect x="15" y="68" width="238" height="34" rx="5" fill="#38252b"/><rect x="28" y="31" width="229" height="34" rx="5" fill="#39252b"/></g><g fill="#ecd4a4"><rect x="42" y="222" width="160" height="18"/><rect x="50" y="185" width="164" height="18"/><rect x="37" y="148" width="168" height="18"/><rect x="49" y="111" width="161" height="18"/><rect x="34" y="74" width="166" height="18"/><rect x="47" y="37" width="162" height="18"/></g><circle cx="225" cy="50" r="14" fill="#846297"/>`,
  ],
  rulebook: [
    620,
    540,
    `<path d="M12 47h540q35 0 35 35v418H12Z" fill="#5b3c34" stroke="#ba825b" stroke-width="12"/><path d="M20 55h519v420H20Z" fill="#e6cca0"/><path d="M90 110h415M90 170h415M90 230h415M90 290h415M90 350h415M90 410h360" stroke="#a77e60" stroke-opacity=".55" stroke-width="5"/><rect x="8" y="42" width="20" height="440" fill="#704438"/><circle cx="18" cy="270" r="8" fill="#b85240"/>`,
  ],
  "routing-machine": [
    360,
    260,
    `<rect x="14" y="70" width="332" height="174" rx="23" fill="#2f262e" stroke="#a07865" stroke-width="9"/><rect x="38" y="90" width="285" height="56" rx="10" fill="#15131f" stroke="#825a54" stroke-width="5"/><g fill="#e6b364"><circle cx="73" cy="178" r="16"/><circle cx="142" cy="178" r="16"/><circle cx="211" cy="178" r="16"/><circle cx="280" cy="178" r="16"/></g><path d="M88 74 72 12M180 74 180 12M272 74 288 12" stroke="#b59c87" stroke-width="10"/><g fill="#b43939"><circle cx="72" cy="17" r="19"/><circle cx="180" cy="17" r="19"/><circle cx="288" cy="17" r="19"/></g>`,
  ],
  "lever-console": [
    320,
    200,
    `<rect x="9" y="62" width="302" height="125" rx="16" fill="#342831" stroke="#a37b65" stroke-width="7"/><g stroke="#b49a87" stroke-width="10"><path d="M67 116 56 21M159 116 159 21M253 116 264 21"/></g><g fill="#dc5440"><circle cx="56" cy="21" r="21"/><circle cx="159" cy="21" r="21"/><circle cx="264" cy="21" r="21"/></g><circle cx="278" cy="91" r="11" fill="#f1934b"/>`,
  ],
  "lever-arm": [
    100,
    170,
    `<path d="M50 155 50 45" stroke="#c9a68c" stroke-width="13"/><circle cx="50" cy="34" r="26" fill="#b83c3c" stroke="#5f2d36" stroke-width="7"/><rect x="18" y="145" width="64" height="20" rx="7" fill="#2e2630"/>`,
  ],
  button: [
    260,
    88,
    `<rect x="7" y="10" width="246" height="70" rx="13" fill="#17121c"/><rect x="4" y="4" width="246" height="70" rx="13" fill="#fff6dd" stroke="#f8e8c9" stroke-width="5"/><path d="M20 20h210" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`,
  ],
  "warning-light": [
    56,
    56,
    `<circle cx="28" cy="28" r="26" fill="#38232b" stroke="#a77359" stroke-width="5"/><circle cx="28" cy="28" r="18" fill="#f06b38"/><circle cx="28" cy="28" r="9" fill="#ffd8a0"/>`,
  ],
  "room-sign": [
    880,
    85,
    `<rect x="4" y="4" width="872" height="77" rx="15" fill="#261b26" stroke="#b68260" stroke-width="5"/><rect x="13" y="12" width="854" height="61" rx="10" fill="#fff" fill-opacity=".04" stroke="#fff" stroke-width="4"/>`,
  ],
  soul: [
    140,
    170,
    `<ellipse cx="70" cy="79" rx="54" ry="57" fill="#78d8e7" opacity=".3"/><circle cx="70" cy="68" r="39" fill="#91eafa"/><path d="M31 81 70 151 109 81" fill="#91eafa"/><g fill="#193442"><circle cx="55" cy="66" r="5"/><circle cx="84" cy="66" r="5"/></g>`,
  ],
  plant: [
    120,
    140,
    `<path d="M60 123V40" stroke="#71b468" stroke-width="8"/><ellipse cx="35" cy="62" rx="31" ry="13" fill="#78bb70" transform="rotate(20 35 62)"/><ellipse cx="85" cy="54" rx="31" ry="13" fill="#78bb70" transform="rotate(-25 85 54)"/><path d="M34 109h53l-9 27H43Z" fill="#725346" stroke="#b07b5d" stroke-width="4"/>`,
  ],
  "demon-eyes": [
    100,
    30,
    `<path d="M5 6q19-11 38 5Q24 34 5 6Zm52 5Q76-5 95 6q-19 28-38 5Z" fill="#f3653c"/><circle cx="25" cy="14" r="4" fill="#26151e"/><circle cx="76" cy="14" r="4" fill="#26151e"/>`,
  ],
  stamp: [
    90,
    90,
    `<rect x="9" y="63" width="72" height="19" rx="5" fill="#392930" stroke="#a87b5f" stroke-width="4"/><path d="M25 63 32 35h26l7 28" fill="#aa5643" stroke="#743e3d" stroke-width="4"/><rect x="31" y="14" width="28" height="21" rx="7" fill="#b88863"/>`,
  ],
  "fax-slip": [
    160,
    32,
    `<rect x="3" y="3" width="154" height="26" rx="5" fill="#ead2a4" stroke="#a47759" stroke-width="3"/><path d="M17 10h112M17 18h87" stroke="#c55b46" stroke-width="2"/>`,
  ],
  spark: [
    32,
    32,
    `<path d="M16 0 19 13 32 16 19 19 16 32 13 19 0 16 13 13Z" fill="#ffe19b" stroke="#e96e39" stroke-width="2"/>`,
  ],
  handset: [
    280,
    100,
    `<path d="M20 74Q12 20 50 14l32 4 21 43h74l21-43 32-4q38 6 30 60l-42 11-28-23H90L62 85Z" fill="#251c27" stroke="#9b7164" stroke-width="7"/>`,
  ],
  "soul-mouth": [
    60,
    30,
    `<path d="M5 8q25 27 50 0" fill="none" stroke="#183744" stroke-width="6" stroke-linecap="round"/>`,
  ],
  smoke: [
    130,
    65,
    `<g fill="#afb0b5" opacity=".72"><ellipse cx="30" cy="42" rx="29" ry="20"/><ellipse cx="59" cy="29" rx="33" ry="25"/><ellipse cx="92" cy="38" rx="34" ry="22"/></g>`,
  ],
};

let created = 0;
for (const [name, [width, height, body]] of Object.entries(sprites)) {
  const path = join(directory.pathname, `${name}.svg`);
  if (existsSync(path)) continue;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>\n`;
  writeFileSync(path, svg);
  created++;
}
console.log(`Wrote ${created} new placeholder sprites.`);
