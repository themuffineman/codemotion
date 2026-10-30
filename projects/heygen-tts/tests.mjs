// The head-to-head tests: HeyGen Voice 1 against Gemini 3.8 Flash TTS on the same text.
// Same kinds of test as the Gemini review (projects/gemini-tts/tests.mjs), with new texts and voices
// so it doesn't repeat that video.
// `gemini` / `heygen` are each model's voice. `instructions` is Gemini's style prompt; HeyGen takes none
// (the same request with and without one returns identical audio), so it only gets the text.

export const tests = [
  {
    id: "01-narration",
    title: "Audiobook narration",
    gemini: "Iapetus",
    heygen: "lucian",
    instructions: "Calm, warm audiobook narrator. Unhurried pace.",
    input:
      "Nobody in the village could remember who had planted the orchard. The trees were older than the church, older than the mill, and every autumn they gave more apples than anyone could carry. That year, for the first time, a single tree at the very end of the last row gave none at all.",
  },
  {
    id: "02-news",
    title: "News anchor",
    gemini: "Schedar",
    heygen: "gareth",
    instructions: "Professional evening news anchor. Clear, confident, measured.",
    input:
      "Good evening. Heavy rain across the north of the country has closed four major roads and delayed trains for a second day. Forecasters expect another sixty millimetres overnight, and residents in low lying areas are being asked to move their cars to higher ground before midnight.",
  },
  {
    id: "03-casual",
    title: "Telling a friend a story",
    gemini: "Callirrhoe",
    heygen: "tabitha",
    instructions: "Relaxed and casual, like telling a friend a story on the phone. Natural hesitations.",
    input:
      "So I signed up for that pottery class, right? And I thought, how hard can it be. Um. Very hard, it turns out. My first bowl collapsed, like, completely. The teacher just looked at it and said, interesting. Interesting! That's all she said. Anyway, I'm going back on Tuesday.",
  },
  {
    id: "04-technical",
    title: "Commands, prices and versions",
    gemini: "Alnilam",
    heygen: "weston",
    instructions: "Developer explaining something to a colleague. Natural, not robotic.",
    input:
      "Pull the latest from main, then run docker compose up with the dash d flag. The dashboard lives at 127.0.0.1:8080/admin. We moved to Postgres 17.2 on 14/11/2026, and the new plan costs $19.99 a month, or about 0.7 cents per request after the first 10k.",
  },
  {
    id: "05-tongue-twister",
    title: "Tongue twister",
    gemini: "Laomedeia",
    heygen: "noelle",
    instructions: "Say it quickly and cleanly, slightly showing off.",
    input:
      "Freshly fried flying fish, freshly fried flesh, and a big black bug bit a big black bear, but the big black bear bit the big black bug back.",
  },
  {
    id: "06-sad",
    title: "Grief",
    gemini: "Gacrux",
    heygen: "meredith",
    instructions: "Quiet and grieving, voice close to breaking, slow with long pauses.",
    input:
      "She used to call me every Sunday at six. Every single Sunday. Sometimes I'd let it ring because I was busy. And now it's six o'clock on a Sunday, and the phone is just sitting there. I'd give anything to hear it ring one more time.",
  },
  {
    id: "07-whisper",
    title: "Whisper",
    gemini: "Achernar",
    heygen: "sabrina",
    instructions: "Soft whisper, like telling a secret in a quiet library.",
    input:
      "Okay, don't look now, but the man by the window has been reading the same page for twenty minutes. And I'm pretty sure the book is upside down. No, don't look! Just, wait a second. Okay. Now.",
  },
  {
    id: "08-laugh",
    title: "Laughing while talking",
    gemini: "Autonoe",
    heygen: "nadine",
    instructions: "Can barely get the words out from laughing. Genuine giggles between phrases.",
    input:
      "So my grandma learns how to send voice messages, right, and she's so proud of it. And she sends me one, and it's four minutes long, and the whole time she's just saying, is this working? Is it on? Four minutes! And at the end she goes, okay, I'll just text you.",
  },
  {
    id: "09-angry",
    title: "Angry",
    gemini: "Algenib",
    heygen: "bram",
    instructions: "Furious neighbour at the door, barely keeping it together, getting louder.",
    input:
      "It is three in the morning. Three! I have asked you twice this week to turn the music down. Twice! I have work in four hours, and I can hear every single word of every single song through my wall. So either you turn it off, or I'm calling the building manager. Right now.",
  },
  {
    id: "10-hype",
    title: "Excitement: race commentary",
    gemini: "Sadaltager",
    heygen: "vincent",
    instructions: "Motor racing commentator going wild, fast and loud, rising to a shout.",
    input:
      "Final lap, and he's right on his gearbox! Into the last corner, he goes up the inside, they touch, they're side by side down to the line! And he takes it! By a tenth of a second! What a race! What an absolute race!",
  },
  {
    id: "11-dialogue",
    title: "Two speakers",
    gemini: "Erinome",
    heygen: "noelle",
    instructions: "Two friends chatting, relaxed and natural.",
    input: [
      { gemini: "Erinome", heygen: "noelle", text: "Did you finish that show I told you about?" },
      { gemini: "Umbriel", heygen: "lucian", text: "I did. In one night. I didn't sleep at all." },
      { gemini: "Erinome", heygen: "noelle", text: "One night? It's ten episodes!" },
      { gemini: "Umbriel", heygen: "lucian", instructions: "guilty, laughing", text: "I know. I regret nothing." },
      { gemini: "Erinome", heygen: "noelle", instructions: "teasing", text: "You're going to be useless at work today." },
    ],
  },
  {
    // The same message translated, one clip per language.
    id: "12-languages",
    title: "Languages (same message, one clip each)",
    gemini: "Pulcherrima",
    heygen: "sabrina",
    variants: [
      { suffix: "spanish", instructions: "Friendly, natural native Spanish speaker.", input: "Esta mañana fui al mercado y compré demasiadas naranjas. Ahora tengo una cocina llena de naranjas y no sé qué hacer con ellas. ¿Alguien tiene una buena receta?" },
      { suffix: "french", instructions: "Friendly, natural native French speaker.", input: "Ce matin, je suis allée au marché et j'ai acheté beaucoup trop d'oranges. Maintenant, ma cuisine est pleine d'oranges et je ne sais pas quoi en faire. Quelqu'un a une bonne recette ?" },
      { suffix: "german", instructions: "Friendly, natural native German speaker.", input: "Heute Morgen war ich auf dem Markt und habe viel zu viele Orangen gekauft. Jetzt ist meine Küche voller Orangen und ich weiß nicht, was ich damit machen soll. Hat jemand ein gutes Rezept?" },
      { suffix: "italian", instructions: "Friendly, natural native Italian speaker.", input: "Stamattina sono andata al mercato e ho comprato troppe arance. Adesso ho la cucina piena di arance e non so cosa farne. Qualcuno ha una buona ricetta?" },
      { suffix: "japanese", instructions: "Friendly, natural native Japanese speaker.", input: "今朝、市場でオレンジを買いすぎてしまいました。今、台所がオレンジでいっぱいで、どうしたらいいかわかりません。誰かいいレシピを知っていますか？" },
      { suffix: "korean", instructions: "Friendly, natural native Korean speaker.", input: "오늘 아침에 시장에 가서 오렌지를 너무 많이 샀어요. 지금 부엌이 오렌지로 가득한데 어떻게 해야 할지 모르겠어요. 좋은 레시피 아는 사람 있어요?" },
      { suffix: "mandarin", instructions: "Friendly, natural native Mandarin Chinese speaker.", input: "今天早上我去市场买了太多橙子。现在厨房里全是橙子，我不知道该拿它们怎么办。有人有好的食谱吗？" },
      { suffix: "hindi", instructions: "Friendly, natural native Hindi speaker.", input: "आज सुबह मैं बाज़ार गई और बहुत ज़्यादा संतरे खरीद लिए। अब मेरी रसोई संतरों से भरी है और मुझे समझ नहीं आ रहा कि इनका क्या करूँ। किसी के पास कोई अच्छी रेसिपी है?" },
    ],
  },
  {
    // Kept to hear whether HeyGen acts out angle-bracket tags; cut from the video if it doesn't.
    id: "13-tags",
    title: "Emotion tags in the text",
    gemini: "Vindemiatrix",
    heygen: "tabitha",
    input:
      "<sighs> I spent all weekend building that shelf. <laughs> And it's actually standing! <whispering> Don't tell anyone, but I have three screws left over. <nervous> I'm sure they weren't important.",
  },
];
