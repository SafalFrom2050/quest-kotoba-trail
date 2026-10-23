// Game practice follows an explanation, so it is always practice with a hint.
// This module neither reads nor writes the learner's study checkpoints.

export const WORLD_LESSONS = Object.freeze({
  wordwood: ['gi', 'ron', 'kankei'],
  workshop: ['naosu', 'naoru', 'osore'],
  sky: ['motozuite', 'tameni', 'youni'],
});

export const LESSONS = [
  {
    id: 'gi',
    kind: 'kanji',
    title: '議',
    kana: 'ぎ',
    romaji: 'gi',
    meaning: 'Deliberation / discussion / debate',
    hook: {
      en: "Picture Quest at a meeting table, discussing ideas with the team. Link 議 and its reading gi to discussion.",
      ne: 'Quest ko meeting table samjha: sabai jana kura garera idea discuss garchhan. 議 ko gi = discussion ko signal, bro.',
    },
    explanation: '議 carries the idea of discussing or deliberating. Its reading in these compounds is gi: 会議 (kaigi) is a meeting, 議論 (giron) is discussion or debate, and 議員 (giin) is an assembly member. The kanji gives a shared idea; the whole compound gives the specific meaning. The meeting-table picture is a memory aid, not a historical explanation of the kanji.',
    examples: [
      { japanese: '会議で安全について議論します。', romaji: 'Kaigi de anzen ni tsuite giron shimasu.', english: 'We discuss safety at the meeting.' },
      { japanese: '午後に会議があります。', romaji: 'Gogo ni kaigi ga arimasu.', english: 'There is a meeting in the afternoon.' },
    ],
    questions: [
      {
        id: 'gi-1', prompt: 'In 会議 (kaigi), which sound belongs to 議?',
        support: {
          en: '会 is read kai. Now choose the sound of the remaining kanji.',
          ne: '会 ko sound kai ho. Aba baki kanji ko sound chhana.',
        },
        choices: [{ text: 'gi' }, { text: 'ron' }, { text: 'min' }], answer: 0,
        why: '会議 is kai + gi. 議 is read gi here; ron belongs to 論, and min belongs to 民.',
      },
      {
        id: 'gi-2', prompt: 'Quest and the team gather at a table to discuss tomorrow’s schedule. Which word names that meeting?',
        choices: [{ text: '環境 — kankyou', note: 'environment' }, { text: '会議 — kaigi', note: 'meeting' }, { text: '病気 — byouki', note: 'illness' }], answer: 1,
        why: '会議 means a meeting. 環境 describes an environment, and 病気 means illness.',
      },
      {
        id: 'gi-3', prompt: 'What are they doing in this sentence?',
        context: '会議で安全について議論します。', romaji: 'Kaigi de anzen ni tsuite giron shimasu.',
        choices: [{ text: 'Repairing a broken switch' }, { text: 'Curing an illness' }, { text: 'Discussing safety at a meeting' }], answer: 2,
        why: '会議で gives the setting, “at the meeting”; 安全について gives the topic, “about safety”; 議論します means “discuss/debate.”',
      },
    ],
  },
  {
    id: 'ron', kind: 'kanji', title: '論', kana: 'ろん', romaji: 'ron',
    meaning: 'Argument / discussion / reasoning',
    hook: {
      en: "Quest gives reasons for an idea instead of simply stating it. Link 論, ron, to a notebook full of reasoning and discussion.",
      ne: 'Quest le idea bolera matra chhoddaina, reason pani dinchha. 論 lai reason ra discussion ko note-book sanga joda.',
    },
    explanation: '論 often appears in compounds about reasoning, discussion, or written arguments. 議論 (giron) is a discussion or debate, 論文 (ronbun) is a research paper or thesis, and 結論 (ketsuron) is a conclusion. In all three, 論 is read ron. The word 論文 refers to a written work; it does not mean every kind of research activity.',
    examples: [
      { japanese: '会議で改善案を議論します。', romaji: 'Kaigi de kaizen-an o giron shimasu.', english: 'We discuss a proposal for improvement at the meeting.' },
      { japanese: 'この論文を読みました。', romaji: 'Kono ronbun o yomimashita.', english: 'I read this research paper.' },
      { japanese: '結論を説明します。', romaji: 'Ketsuron o setsumei shimasu.', english: 'I will explain the conclusion.' },
    ],
    questions: [
      {
        id: 'ron-1', prompt: 'In 議論 (giron), how is 論 read?',
        choices: [{ text: 'gi' }, { text: 'ron' }, { text: 'kei' }], answer: 1,
        why: '議論 is gi + ron. 議 contributes gi, and 論 contributes ron.',
      },
      {
        id: 'ron-2', prompt: 'Quest needs to read a published research paper. Which item should he pick up?',
        choices: [{ text: '論文 — ronbun' }, { text: '米 — kome' }, { text: '時計 — tokei' }], answer: 0,
        why: '論文 is a research paper or thesis. 米 is rice, and 時計 is a clock or watch.',
      },
      {
        id: 'ron-3', prompt: 'After comparing the ideas, what will Quest explain?',
        context: '結論を説明します。', romaji: 'Ketsuron o setsumei shimasu.',
        choices: [{ text: 'The surrounding environment' }, { text: 'A treatment for illness' }, { text: 'The conclusion' }], answer: 2,
        why: '結論 means conclusion, and 説明します means explain. The sentence says “I will explain the conclusion.”',
      },
    ],
  },
  {
    id: 'kankei', kind: 'kanji', title: '関係', kana: 'かんけい', romaji: 'kankei',
    meaning: 'Relation / relationship / connection',
    hook: {
      en: "Quest checks the connection between two gears: 関係, kankei. The surrounding workshop is the environment: 環境, kankyou. Keep the two readings distinct.",
      ne: 'Quest le dui gear bichko connection herchha: 関係 = kankei. Waripari ko scene samjhinu paryo bhane 環境 = kankyou; dui sound lai alag rakha.',
    },
    explanation: '関係 (kankei) means a relation, relationship, or connection. Here 関 is kan and 係 is kei. 環境 (kankyou) means environment: its surroundings, conditions, or setting. Use ～に関係があります to say something is related to something else. A temperature-related problem uses 関係; lighting and ventilation are part of the 作業環境 (sagyou kankyou), the working environment.',
    examples: [
      { japanese: 'この問題は温度に関係があります。', romaji: 'Kono mondai wa ondo ni kankei ga arimasu.', english: 'This problem is related to temperature.' },
      { japanese: '作業環境を改善します。', romaji: 'Sagyou kankyou o kaizen shimasu.', english: 'We will improve the working environment.' },
    ],
    questions: [
      {
        id: 'kankei-1', prompt: 'Which reading matches 関係?',
        choices: [{ text: 'kankyou' }, { text: 'ketsuron' }, { text: 'kankei' }], answer: 2,
        why: '関係 is kankei: 関 = kan and 係 = kei. The similar-sounding kankyou is 環境, environment.',
      },
      {
        id: 'kankei-2', prompt: 'The error is related to temperature. Complete the sentence.',
        context: 'このエラーは温度に ___ があります。', romaji: 'Kono eraa wa ondo ni ___ ga arimasu.',
        choices: [{ text: '関係 — kankei' }, { text: '環境 — kankyou' }, { text: '論文 — ronbun' }], answer: 0,
        why: '温度に関係があります means “is related to temperature.” 環境 is the environment; 論文 is a research paper.',
      },
      {
        id: 'kankei-3', prompt: 'Quest improves the workshop’s lighting and ventilation. Which word describes the working environment?',
        context: '作業 ___ を改善します。', romaji: 'Sagyou ___ o kaizen shimasu.',
        choices: [{ text: '結論 — ketsuron' }, { text: '環境 — kankyou' }, { text: '病気 — byouki' }], answer: 1,
        why: '作業環境 means the working environment. Lighting and ventilation are environmental conditions. 結論 is a conclusion and 病気 is illness.',
      },
    ],
  },
  {
    id: 'naosu', kind: 'kanji', title: '治す・直す', kana: 'なおす・なおす', romaji: 'naosu / naosu',
    meaning: 'Cure an illness / fix or correct something',
    hook: {
      en: "Quest uses medicine to cure an illness: 治す. He uses a wrench to fix a broken clock: 直す. Both are naosu; what is being treated or repaired determines the kanji.",
      ne: 'Quest ko medicine bottle = 治す; wrench ra broken clock = 直す. Sound eutai naosu ho, tara object le kanji chhanauchha.',
    },
    explanation: 'Both verbs are read naosu and describe someone doing the action: they are transitive. 治す is used for curing an illness or healing an injury; 直す is used for fixing a broken object or correcting a mistake. The thing being cured or corrected usually takes を (o). Compare 病気を治す, cure an illness, with 時計を直す, fix a clock. The paired intransitive verbs are 治る and 直る, read naoru.',
    examples: [
      { japanese: '医師が病気を治します。', romaji: 'Ishi ga byouki o naoshimasu.', english: 'A doctor cures the illness.' },
      { japanese: '時計を直します。', romaji: 'Tokei o naoshimasu.', english: 'I will fix the clock.' },
      { japanese: 'レポートの間違いを直します。', romaji: 'Repooto no machigai o naoshimasu.', english: 'I will correct the mistakes in the report.' },
    ],
    questions: [
      {
        id: 'naosu-1', prompt: 'How do you read 直す, the dictionary form meaning “fix something”?',
        choices: [{ text: 'naoru' }, { text: 'naosu' }, { text: 'naoshita' }], answer: 1,
        why: '直す is naosu. 直る (naoru) describes something becoming fixed; 直した (naoshita) is the past form of 直す.',
      },
      {
        id: 'naosu-2', prompt: 'Quest is repairing a broken clock. Which verb belongs in this sentence?',
        context: '時計を ___ 。', romaji: 'Tokei o ___.',
        choices: [{ text: '治る — naoru' }, { text: '治す — naosu' }, { text: '直す — naosu' }], answer: 2,
        why: 'A clock is a broken object, so use 直す. 治す is for illness or injury, and 治る is intransitive.',
      },
      {
        id: 'naosu-3', prompt: 'The doctor is treating and curing an illness. Choose the matching verb.',
        context: '医師が病気を ___ 。', romaji: 'Ishi ga byouki o ___.',
        choices: [{ text: '治す — naosu' }, { text: '直す — naosu' }, { text: '治る — naoru' }], answer: 0,
        why: 'The doctor acts on the illness: 病気を治す. 治る would describe the illness getting better, with 病気が.',
      },
    ],
  },
  {
    id: 'naoru', kind: 'kanji', title: '治る・直る', kana: 'なおる・なおる', romaji: 'naoru / naoru',
    meaning: 'Recover / become fixed (intransitive)',
    hook: {
      en: "Quest checks the result: the patient gets better, 治る; the clock works again, 直る. Both are naoru and focus on the changed condition.",
      ne: 'Quest le result herchha: patient niko bhayo = 治る; clock feri chalyo = 直る. Naoru ma recovery ko result focus ho.',
    },
    explanation: 'Both verbs are read naoru and describe a change in the subject: they are intransitive. 病気が治る means an illness gets better; 時計が直る means a clock becomes fixed. が marks the thing whose condition changes. This grammar does not claim that a machine repaired itself; the sentence simply focuses on the repaired result. Use 治す or 直す when naming someone’s act of curing or repairing.',
    examples: [
      { japanese: '病気が治りました。', romaji: 'Byouki ga naorimashita.', english: 'The illness got better.' },
      { japanese: '時計が直りました。', romaji: 'Tokei ga naorimashita.', english: 'The clock is fixed now.' },
      { japanese: '私が時計を直しました。', romaji: 'Watashi ga tokei o naoshimashita.', english: 'I fixed the clock.' },
    ],
    questions: [
      {
        id: 'naoru-1', prompt: 'How do you read 治る, the dictionary form meaning “recover”?',
        choices: [{ text: 'naoru' }, { text: 'naosu' }, { text: 'naoshimasu' }], answer: 0,
        why: '治る is naoru. 治す is naosu, and 治します is naoshimasu, the polite form of the transitive verb.',
      },
      {
        id: 'naoru-2', prompt: 'The broken clock now works. The sentence focuses on that result. Complete it.',
        context: '時計が ___ 。', romaji: 'Tokei ga ___.',
        choices: [{ text: '治りました — naorimashita' }, { text: '直しました — naoshimashita' }, { text: '直りました — naorimashita' }], answer: 2,
        why: '時計が直りました focuses on the clock becoming fixed. 治る belongs to illness or injury; 直す describes an actor repairing an object.',
      },
      {
        id: 'naoru-3', prompt: 'Which sentence says “I fixed the clock,” explicitly naming the person doing the repair?',
        choices: [{ text: '時計が直りました。', note: 'Tokei ga naorimashita.' }, { text: '私が時計を直しました。', note: 'Watashi ga tokei o naoshimashita.' }, { text: '病気が治りました。', note: 'Byouki ga naorimashita.' }], answer: 1,
        why: '私が names the actor, 時計を names the object, and 直しました is “fixed.” 時計が直りました reports the clock’s repaired condition without naming who repaired it.',
      },
    ],
  },
  {
    id: 'osore', kind: 'grammar', title: '～恐れがある', kana: 'おそれがある', romaji: 'osore ga aru',
    meaning: 'There is a risk / danger that…',
    hook: {
      en: "Picture Quest spotting a warning sign about something that could go wrong. 恐れがある describes a risk, not an outcome that has already happened.",
      ne: 'Quest ko warning sign dekhda “huna sakne naramro result” samjha. 恐れがある le risk bhancha; pakka bhayo bhaneko haina.',
    },
    explanation: '～恐れがある describes a risk of an undesirable outcome, often in formal reports or warnings. Attach it to a plain-form clause, such as 落下する恐れがある, “there is a risk it will fall,” or to a noun with の, such as 故障の恐れがある, “there is a risk of breakdown.” The polite form is 恐れがあります. It expresses possibility, not certainty. 故障 is read koshou: the first ko is short, and shou is long.',
    examples: [
      { japanese: '故障の恐れがあります。', romaji: 'Koshou no osore ga arimasu.', english: 'There is a risk of breakdown.' },
      { japanese: 'この部品は落下する恐れがあります。', romaji: 'Kono buhin wa rakka suru osore ga arimasu.', english: 'There is a risk that this part will fall.' },
      { japanese: '感電の恐れがあります。', romaji: 'Kanden no osore ga arimasu.', english: 'There is a risk of electric shock.' },
    ],
    questions: [
      {
        id: 'osore-1', prompt: 'What does this warning communicate?',
        context: '故障の恐れがあります。', romaji: 'Koshou no osore ga arimasu.',
        choices: [{ text: 'The machine has definitely broken down already.' }, { text: 'There is a risk of breakdown.' }, { text: 'A breakdown is impossible.' }], answer: 1,
        why: '恐れがあります reports a risk. It does not say the breakdown has already happened or that it is certain.',
      },
      {
        id: 'osore-2', prompt: '感電 is a noun meaning electric shock. Which particle connects it to 恐れ?',
        context: '感電 ___ 恐れがあります。', romaji: 'Kanden ___ osore ga arimasu.',
        choices: [{ text: 'を — o' }, { text: 'が — ga' }, { text: 'の — no' }], answer: 2,
        why: 'The noun pattern is noun + の + 恐れがある. 感電の恐れ means “risk of electric shock.”',
      },
      {
        id: 'osore-3', prompt: 'A report must say “There is a risk that this part will fall.” Which sentence expresses that possibility?',
        choices: [{ text: 'この部品は落下する恐れがあります。', note: 'Kono buhin wa rakka suru osore ga arimasu.' }, { text: 'この部品は落下しました。', note: 'Kono buhin wa rakka shimashita.' }, { text: 'この部品は落下しません。', note: 'Kono buhin wa rakka shimasen.' }], answer: 0,
        why: '落下する恐れがあります says there is a risk of falling. 落下しました says it fell, while 落下しません says it will not fall.',
      },
    ],
  },
  {
    id: 'motozuite', kind: 'grammar', title: '～に基づいて', kana: 'にもとづいて', romaji: 'ni motozuite',
    meaning: 'Based on / in accordance with…',
    hook: {
      en: "Quest uses a blueprint as the foundation for his work. に基づいて answers the question: what document, evidence, or rule is this based on?",
      ne: 'Quest ko blueprint foundation ho: specification bata kaam ko base milchha. “Kun document ko aadhar ma?” bhanne bela に基づいて.',
    },
    explanation: 'Noun + に基づいて identifies the basis for an action or decision: a specification, standard, rule, or evidence. 基づいて comes from 基づく (motozuku), “be based on.” The kana contains づ; ordinary modern pronunciation is represented here as zu. 仕様書に基づいて means “based on / in accordance with the specification.” The phrase names a basis. In the purpose examples here, ～ために instead names a goal.',
    examples: [
      { japanese: '仕様書に基づいて作業します。', romaji: 'Shiyousho ni motozuite sagyou shimasu.', english: 'I will work according to the specification.' },
      { japanese: '基準に基づいて確認します。', romaji: 'Kijun ni motozuite kakunin shimasu.', english: 'I will check in accordance with the standards.' },
      { japanese: 'データに基づいて判断します。', romaji: 'Deeta ni motozuite handan shimasu.', english: 'We make a judgment based on the data.' },
    ],
    questions: [
      {
        id: 'motozuite-1', prompt: 'Which reading matches 基づいて?',
        choices: [{ text: 'motozuite' }, { text: 'mototsuite' }, { text: 'motoite' }], answer: 0,
        why: '基づいて is もとづいて, motozuite. Keep the づ syllable; it is not つ, and it is not omitted.',
      },
      {
        id: 'motozuite-2', prompt: 'The latest specification is the basis for checking the design. Complete the sentence.',
        context: '最新の仕様書 ___ 、設計を確認します。', romaji: 'Saishin no shiyousho ___, sekkei o kakunin shimasu.',
        choices: [{ text: 'を治して — o naoshite', note: 'curing it' }, { text: 'の恐れがあり — no osore ga ari', note: 'there being a risk of it' }, { text: 'に基づいて — ni motozuite', note: 'based on it' }], answer: 2,
        why: 'The specification is the basis, so use 仕様書に基づいて. 治す concerns illness or injury, and a risk of a specification does not express the intended relationship.',
      },
      {
        id: 'motozuite-3', prompt: 'What role do the standards play here?',
        context: '基準に基づいて確認します。', romaji: 'Kijun ni motozuite kakunin shimasu.',
        choices: [{ text: 'The standards are being physically repaired.' }, { text: 'The check is performed in accordance with the standards.' }, { text: 'There is a risk the standards will fall.' }], answer: 1,
        why: '基準に基づいて identifies the standards as the basis for 確認します, “check/confirm.”',
      },
    ],
  },
  {
    id: 'tameni', kind: 'grammar', title: '～ために', kana: 'ために', romaji: 'tame ni',
    meaning: 'For the purpose of / in order to…',
    hook: {
      en: "Picture Quest aiming for a target flag. ために connects an action with its purpose: what goal is he working toward?",
      ne: 'Quest ko target flag samjha: “yo kaam kina?” Goal ko lagi action gareko ho bhane ために use gara.',
    },
    explanation: 'In the purpose use, ～ために connects an action to an intended goal. Use a dictionary-form intentional verb + ために, as in 資格を取るために, “in order to obtain a qualification,” or noun + のために, as in 安全確認のために, “for safety checks.” With two intentional actions, the doer is normally the same. ために can also express a cause in other contexts; this lesson focuses on purpose.',
    examples: [
      { japanese: '資格を取るために、毎日勉強します。', romaji: 'Shikaku o toru tame ni, mainichi benkyou shimasu.', english: 'I study every day in order to obtain a qualification.' },
      { japanese: '安全確認のために、点検表を使います。', romaji: 'Anzen kakunin no tame ni, tenkenhyou o tsukaimasu.', english: 'We use a checklist for safety checks.' },
      { japanese: '記録を残すために、ファイルを保存します。', romaji: 'Kiroku o nokosu tame ni, fairu o hozon shimasu.', english: 'I save the file in order to keep a record.' },
    ],
    questions: [
      {
        id: 'tameni-1', prompt: 'What is the purpose of saving the file?',
        context: '記録を残すために、ファイルを保存します。', romaji: 'Kiroku o nokosu tame ni, fairu o hozon shimasu.',
        choices: [{ text: 'To delete the record' }, { text: 'To keep a record' }, { text: 'Because the file was already deleted' }], answer: 1,
        why: '記録を残す means keep/leave a record, and ために marks it as the purpose of saving the file.',
      },
      {
        id: 'tameni-2', prompt: '安全確認 is a noun phrase. Which particle forms “for safety checks”?',
        context: '安全確認 ___ ために、点検表を使います。', romaji: 'Anzen kakunin ___ tame ni, tenkenhyou o tsukaimasu.',
        choices: [{ text: 'の — no' }, { text: 'が — ga' }, { text: 'を — o' }], answer: 0,
        why: 'The purpose pattern after a noun is noun + のために. 安全確認のために means “for safety checks.”',
      },
      {
        id: 'tameni-3', prompt: 'Quest studies every day because his goal is to obtain a qualification. Which sentence states that goal?',
        choices: [{ text: '資格を取りました。', note: 'Shikaku o torimashita. — I obtained a qualification.' }, { text: '資格を取りません。', note: 'Shikaku o torimasen. — I will not obtain a qualification.' }, { text: '資格を取るために、毎日勉強します。', note: 'Shikaku o toru tame ni, mainichi benkyou shimasu.' }], answer: 2,
        why: '資格を取るために names the goal, and 毎日勉強します names the action taken to reach it. The other sentences describe completion or refusal, not this purpose.',
      },
    ],
  },
  {
    id: 'youni', kind: 'grammar', title: '～ように', kana: 'ように', romaji: 'you ni',
    meaning: 'So that… (a desired outcome)',
    hook: {
      en: "Quest builds a bridge so that everyone can cross. Link ように with a desired result, such as being able to do something or preventing a problem.",
      ne: 'Quest le bridge banauchha, sabai jana par pugna sakun bhanera. “...sakos / ...nahos” jasto desired result sanga ように samjha.',
    },
    explanation: 'In this use, ～ように describes a desired outcome, especially an ability, a negative outcome to avoid, or a state that is not simply a deliberate act. Potential forms such as 使える (“can use”) and negative forms such as 故障しない (“does not break down”) often come before it. ～ために often states an intentional goal; ～ように often frames an outcome such as “so someone can…” or “so it does not…”. They can overlap in some contexts, so choose with the full sentence in mind.',
    examples: [
      { japanese: '新しいスタッフが使えるように、説明書を作りました。', romaji: 'Atarashii sutaffu ga tsukaeru you ni, setsumeisho o tsukurimashita.', english: 'I made a manual so that new staff can use it.' },
      { japanese: 'みんなに聞こえるように、大きな声で話します。', romaji: 'Minna ni kikoeru you ni, ookina koe de hanashimasu.', english: 'I speak in a loud voice so that everyone can hear.' },
      { japanese: '機械が故障しないように、定期的に点検します。', romaji: 'Kikai ga koshou shinai you ni, teikiteki ni tenken shimasu.', english: 'We inspect the machine regularly so that it does not break down.' },
    ],
    questions: [
      {
        id: 'youni-1', prompt: 'What does 読めるように express in a sentence about making text larger?',
        context: '読めるように、文字を大きくしました。', romaji: 'Yomeru you ni, moji o ookiku shimashita.',
        choices: [{ text: 'So that it can be read' }, { text: 'Because it has already been erased' }, { text: 'So that nobody can read it' }], answer: 0,
        why: '読める is the potential form, “can read.” 読めるように expresses the desired outcome: text that can be read.',
      },
      {
        id: 'youni-2', prompt: 'Quest makes a manual so that new staff can use the system. Which sentence gives that intended outcome?',
        choices: [{ text: '新しいスタッフが使えないように、説明書を作りました。', note: 'Atarashii sutaffu ga tsukaenai you ni, setsumeisho o tsukurimashita.' }, { text: '新しいスタッフが使えるように、説明書を作りました。', note: 'Atarashii sutaffu ga tsukaeru you ni, setsumeisho o tsukurimashita.' }, { text: '新しいスタッフが説明書を捨てました。', note: 'Atarashii sutaffu ga setsumeisho o sutemashita.' }], answer: 1,
        why: '使える means “can use,” so 使えるように states the desired ability. 使えない reverses the goal; 捨てました means the new staff threw away the manual.',
      },
      {
        id: 'youni-3', prompt: 'Why is Quest speaking loudly?',
        context: 'みんなに聞こえるように、大きな声で話します。', romaji: 'Minna ni kikoeru you ni, ookina koe de hanashimasu.',
        choices: [{ text: 'To keep everyone from hearing' }, { text: 'To hear someone else’s quiet voice' }, { text: 'So that everyone can hear him' }], answer: 2,
        why: 'みんなに聞こえるように means “so that it can be heard by everyone.” 大きな声で話します is the action taken for that result.',
      },
    ],
  },
  {
    id: 'min', kind: 'kanji', title: '民', kana: 'みん', romaji: 'min',
    meaning: 'People / citizens / inhabitants',
    hook: {
      en: "Picture the people living in Quest's town. 民 means people; its reading min also appears in 市民, shimin, and 住民, juumin.",
      ne: 'Quest ko town ma basne mancheharu samjha. 民 = people; 市民 ra 住民 ma pani tehi min ko sound aauchha.',
    },
    explanation: '民 carries the idea of people or inhabitants and is commonly read min in compounds. 市民 (shimin) means citizens or townspeople, 住民 (juumin) means residents, and 国民 (kokumin) means a nation’s people or citizens. The first kanji narrows which group of people is meant. The uu in juumin represents a long vowel.',
    examples: [
      { japanese: '住民に説明します。', romaji: 'Juumin ni setsumei shimasu.', english: 'We will explain it to the residents.' },
      { japanese: '市民が公園に集まりました。', romaji: 'Shimin ga kouen ni atsumarimashita.', english: 'The townspeople gathered in the park.' },
    ],
    questions: [
      {
        id: 'min-1', prompt: 'Which reading belongs to 民 in 市民?',
        choices: [{ text: 'ron' }, { text: 'min' }, { text: 'gi' }], answer: 1,
        why: '市民 is shimin: 市 contributes shi and 民 contributes min.',
      },
      {
        id: 'min-2', prompt: 'Quest needs to explain a plan to the people who live in the neighborhood. Which word means residents?',
        choices: [{ text: '論文 — ronbun' }, { text: '環境 — kankyou' }, { text: '住民 — juumin' }], answer: 2,
        why: '住民 means residents. 論文 is a paper or thesis; 環境 is the environment.',
      },
      {
        id: 'min-3', prompt: 'Who receives the explanation here?',
        context: '住民に説明します。', romaji: 'Juumin ni setsumei shimasu.',
        choices: [{ text: 'The residents' }, { text: 'A broken clock' }, { text: 'A specification document' }], answer: 0,
        why: '住民 means residents. に marks them as the recipients of the explanation.',
      },
    ],
  },
  {
    id: 'niyori', kind: 'grammar', title: '～により', kana: 'により', romaji: 'ni yori',
    meaning: 'Due to / caused by… (formal cause)',
    hook: {
      en: "Quest checks an error log to find the cause. A cause noun followed by により gives a formal report the sense of due to or because of.",
      ne: 'Quest ko error log ma “kina error aayo?” khoja. Cause ko noun pachhi により rakhda formal report jasto suninchha.',
    },
    explanation: 'Noun + により can identify the cause of an event in a formal report. 接触不良により means “due to poor contact.” により also has uses for means or an agent in other sentences, but this lesson practices cause. Keep the relationship clear: に基づいて names a basis, ために can name a purpose, and this により names what caused the reported event.',
    examples: [
      { japanese: '接触不良により、エラーが発生しました。', romaji: 'Sesshoku furyou ni yori, eraa ga hassei shimashita.', english: 'An error occurred due to poor contact.' },
      { japanese: '強風により、電車が遅れました。', romaji: 'Kyoufuu ni yori, densha ga okuremashita.', english: 'The train was delayed due to strong winds.' },
    ],
    questions: [
      {
        id: 'niyori-1', prompt: 'Which phrase actually appears in this report to mark the cause?',
        context: '接触不良により、エラーが発生しました。', romaji: 'Sesshoku furyou ni yori, eraa ga hassei shimashita.',
        choices: [{ text: 'により — ni yori' }, { text: 'ために — tame ni' }, { text: 'ように — you ni' }], answer: 0,
        why: 'This sentence uses により to identify 接触不良, poor contact, as the cause of the error.',
      },
      {
        id: 'niyori-2', prompt: 'What caused the delay?',
        context: '強風により、電車が遅れました。', romaji: 'Kyoufuu ni yori, densha ga okuremashita.',
        choices: [{ text: 'A research paper' }, { text: 'A repaired clock' }, { text: 'Strong winds' }], answer: 2,
        why: '強風 means strong winds, and 強風により means “due to strong winds.” 電車が遅れました reports the resulting train delay.',
      },
      {
        id: 'niyori-3', prompt: 'A log must say an error occurred because of poor contact. Which sentence reports that cause?',
        choices: [{ text: 'エラーを直すために、記録を読みました。', note: 'Eraa o naosu tame ni, kiroku o yomimashita.' }, { text: '接触不良により、エラーが発生しました。', note: 'Sesshoku furyou ni yori, eraa ga hassei shimashita.' }, { text: 'エラーが出ないように、確認しました。', note: 'Eraa ga denai you ni, kakunin shimashita.' }], answer: 1,
        why: '接触不良により names the cause and エラーが発生しました reports the event. The other sentences describe an action’s purpose or a desired outcome.',
      },
    ],
  },
  {
    id: 'jitsu', kind: 'kanji', title: '実', kana: 'じつ', romaji: 'jitsu',
    meaning: 'Reality / truth / substance; fruit in other uses',
    hook: {
      en: "Quest tests an idea in a real experiment. Remember the doubled kk in 実験, jikken, experiment; 事件, jiken, means incident.",
      ne: 'Quest le idea lai actual experiment ma check garchha. 実験 ko doubled kk yaad gara: jikken = experiment, jiken = incident.',
    },
    explanation: '実 is often read jitsu, but compound readings can change. 実験 is jikken, an experiment, and 実際 is jissai, “actual / in reality.” Do not confuse 実験 (jikken) with 事件 (jiken), an incident or case: the kanji and the consonant length both differ. 実 can also mean fruit and be read mi in other words; this review focuses on practical compounds.',
    examples: [
      { japanese: '実験の結果を記録します。', romaji: 'Jikken no kekka o kiroku shimasu.', english: 'We record the results of the experiment.' },
      { japanese: '実際に確認します。', romaji: 'Jissai ni kakunin shimasu.', english: 'We will check it in practice.' },
    ],
    questions: [
      {
        id: 'jitsu-1', prompt: 'Which reading matches 実験, “experiment”?',
        choices: [{ text: 'jiken' }, { text: 'jikken' }, { text: 'shiken' }], answer: 1,
        why: '実験 is jikken, with a doubled k. 事件 is jiken, an incident or case; 試験 is shiken, a test or examination.',
      },
      {
        id: 'jitsu-2', prompt: 'Quest records the result of an experiment. Which word belongs in the blank?',
        context: '___ の結果を記録します。', romaji: '___ no kekka o kiroku shimasu.',
        choices: [{ text: '実験 — jikken' }, { text: '米国 — beikoku' }, { text: '病気 — byouki' }], answer: 0,
        why: '実験の結果 means the results of an experiment. 米国 means the United States, and 病気 means illness.',
      },
      {
        id: 'jitsu-3', prompt: 'What does 実際に add to this sentence?',
        context: '実際に確認します。', romaji: 'Jissai ni kakunin shimasu.',
        choices: [{ text: 'The check is impossible.' }, { text: 'The check causes an illness.' }, { text: 'The check will be done in practice / actually.' }], answer: 2,
        why: '実際に means actually or in practice. It grounds the check in the real situation.',
      },
    ],
  },
  {
    id: 'kome', kind: 'kanji', title: '米', kana: 'こめ・べい', romaji: 'kome / bei',
    meaning: 'Rice; America in country-related compounds',
    hook: {
      en: "Quest's rice bowl is 米, kome. On a country sign, 米国 is beikoku, the United States. The compound changes the reading and meaning.",
      ne: 'Quest ko rice bowl = 米, kome. Country ko sign ma 米国 dekhe chai beikoku = United States samjha.',
    },
    explanation: '米 as the everyday word for uncooked rice is read kome. It is also used as an abbreviation for America in compounds, where a common reading is bei: 米国 (beikoku) means the United States. Choose the reading from the word and context. 米を炊く (kome o taku) means cook rice; 米国 does not mean “rice country.”',
    examples: [
      { japanese: '米を炊きます。', romaji: 'Kome o takimasu.', english: 'I will cook rice.' },
      { japanese: '米国の会社です。', romaji: 'Beikoku no kaisha desu.', english: 'It is a company in the United States.' },
    ],
    questions: [
      {
        id: 'kome-1', prompt: 'Quest picks up a bag of rice. How is 米 read as this everyday word?',
        choices: [{ text: 'kome' }, { text: 'min' }, { text: 'beikoku' }], answer: 0,
        why: 'The everyday rice word 米 is kome. 米国 is the different compound beikoku, the United States.',
      },
      {
        id: 'kome-2', prompt: 'Which country does 米国 (beikoku) refer to?',
        choices: [{ text: 'Japan' }, { text: 'China' }, { text: 'The United States' }], answer: 2,
        why: '米国 means the United States. 米 here is the country abbreviation and is read bei.',
      },
      {
        id: 'kome-3', prompt: 'What is Quest going to do?',
        context: '米を炊きます。', romaji: 'Kome o takimasu.',
        choices: [{ text: 'Travel to the United States' }, { text: 'Cook rice' }, { text: 'Write a research paper' }], answer: 1,
        why: '米 is rice here, and 炊きます means cook rice or another grain by boiling/steaming. を marks rice as the object.',
      },
    ],
  },
];

export function learningText(text, language = 'en') {
  if (typeof text === 'string') return text;
  return text?.[language === 'ne' ? 'ne' : 'en'] ?? text?.en ?? '';
}

export function findLesson(id) {
  return LESSONS.find((lesson) => lesson.id === id) ?? null;
}

export function lessonForWorld(worldId, index = 0) {
  return findLesson(WORLD_LESSONS[worldId]?.[index]);
}
