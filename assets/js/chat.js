/**
 * chat.js — KI-Sparringspartner Chat Widget
 * Nichts geschenkt — Das Denkatelier
 * Ruft /api/chat auf. Ist die API nicht erreichbar, antwortet der
 * Hausvorrat: sokratische Gegenfragen aus lokalen Listen. Solche
 * Antworten werden im Chat als solche gekennzeichnet (chat.offlineNote),
 * damit ein Ausfall nicht wie ein denkendes Gegenüber aussieht.
 */
(function () {
  'use strict';

  var chatOpen = false;
  var chatEl = null;
  var messagesEl = null;
  var inputEl = null;
  var history = [];
  var lastFallback = '';

  // Reihenfolge = Priorität: Die erste passende Gruppe antwortet.
  // Konkrete Themen stehen deshalb vor den allgemeinen — sonst fängt
  // etwa „Sorge" die Frage nach dem Klima ab.
  var triggers = [
    {
      trigger: /\bki\b|k\.i\.|künstliche.?intelligenz|artificial|\bai\b|\ba\.i\.\b/i,
      responses: [
        'Wenn KI alles beantworten kann — was ist dann noch deine Frage wert?',
        'Du sagst KI. Aber meinst du Werkzeug oder Ersatz? Das ist nicht dasselbe.',
        'KI produziert Output. Wer produziert das Urteil darüber?',
        'Interessant, dass du KI erwähnst. Hast du heute schon etwas gedacht, das keine Maschine denken könnte?',
        'Die Maschine antwortet immer. Woran erkennst du, dass sie danebenliegt?',
        'Erst du, dann die KI. War es bei dir gerade auch diese Reihenfolge?',
        'Was hast du zuletzt ausgelagert, ohne es zu merken?',
        'Eine KI hat keine Absicht, heißt es. Und die Menschen, die sie gebaut haben?'
      ],
      responsesEn: [
        'If AI can answer everything — what is your question still worth?',
        'You say AI. But do you mean a tool or a replacement? Those are not the same thing.',
        'AI produces output. Who produces the judgment about it?',
        'Interesting that you mention AI. Have you thought anything today that no machine could think?',
        'The machine always answers. How do you notice when it is wrong?',
        'First you, then the AI. Was that the order just now?',
        'What did you outsource most recently without noticing?',
        'An AI has no intentions, they say. And the people who built it?'
      ]
    },
    {
      trigger: /\bbildung\b|lernen|schule|universit|studier|education|learn|school|study/i,
      responses: [
        'Bildung gegen was? Gegen Unwissenheit oder gegen Urteilslosigkeit? Das sind verschiedene Kämpfe.',
        'Was wäre, wenn Bildung nicht mehr heißt: Stoff aufnehmen — sondern: unterscheiden lernen?',
        'Du sprichst von Bildung. Aber wann hat dich zuletzt etwas Gelerntes wirklich verändert?',
        'Prüfungen messen Reproduktion. Was misst Urteilskraft?',
        'Wofür lernst du: für die Prüfung oder für den Fall danach?',
        'Wenn Wissen jederzeit abrufbar ist — wofür ist die Schule dann noch da?',
        'Du hast Jahre gelernt. Welchen Satz davon würdest du heute verteidigen?',
        'Eine Note sagt, was du reproduziert hast. Was sagt, was du verstanden hast?'
      ],
      responsesEn: [
        'Education against what? Against ignorance or against the inability to judge? Those are different battles.',
        'What if education no longer meant absorbing material — but learning to distinguish?',
        'You speak of education. But when did something you learned last truly change you?',
        'Exams measure reproduction. What measures judgment?',
        'What are you learning for: the exam, or the situation after it?',
        'If knowledge is available at any moment — what is school still for?',
        'You studied for years. Which single sentence from it would you defend today?',
        'A grade says what you reproduced. What says what you understood?'
      ]
    },
    {
      trigger: /\barbeit\b|beruf|\bjob\b|karriere|\bchef\b|kolleg|büro|work\b|career|\bboss\b|colleague|office/i,
      responses: [
        'Du arbeitest viel. Woran erkennst du, dass es wichtig war?',
        'Beschäftigt sein und wirksam sein sind zwei verschiedene Dinge. Was war deine Woche?',
        'Wenn dein Job morgen automatisiert wäre — was an dir bliebe unersetzlich?',
        'Du sagst, du hast keine Wahl. Welche hättest du, wenn du weniger bräuchtest?',
        'Wem gegenüber bist du in deiner Arbeit ehrlich? Und wem gegenüber nicht?',
        'Wofür wirst du bezahlt — und wofür arbeitest du wirklich?',
        'Was würdest du an deiner Arbeit ändern, wenn es niemand bemerken würde?',
        'Der Kalender ist voll. Ist es die Arbeit auch?'
      ],
      responsesEn: [
        'You work a lot. How do you know it mattered?',
        'Being busy and being effective are two different things. Which was your week?',
        'If your job were automated tomorrow — what about you would remain irreplaceable?',
        'You say you have no choice. Which one would you have if you needed less?',
        'Who are you honest with at work? And who are you not honest with?',
        'What are you paid for — and what are you really working for?',
        'What would you change about your work if nobody would notice?',
        'Your calendar is full. Is the work full too?'
      ]
    },
    {
      trigger: /\bmedien\b|nachricht|presse|journalis|zeitung|schlagzeile|\bnews\b|media|press\b|headline/i,
      responses: [
        'Du hast es gelesen. Wer wollte, dass du es liest?',
        'Eine Schlagzeile ist ein Angebot, kein Befund. Was steht darunter?',
        'Was hast du heute gelesen, das dich nicht bestätigt hat?',
        'Empörung verbreitet sich schneller als Prüfung. Welche war bei dir zuerst da?',
        'Wenn du nur diese eine Quelle hättest — wüsstest du, was dir fehlt?',
        'Zwischen „gelesen" und „verstanden" liegt Arbeit. Hast du sie gemacht?',
        'Wer profitiert davon, dass du das glaubst?',
        'Du misstraust den Medien. Misstraust du auch dem, was dein Misstrauen bestätigt?'
      ],
      responsesEn: [
        'You read it. Who wanted you to read it?',
        'A headline is an offer, not a finding. What stands underneath it?',
        'What did you read today that did not confirm you?',
        'Outrage spreads faster than checking. Which came first for you?',
        'If you only had this one source — would you know what you are missing?',
        'Between "read" and "understood" there is work. Have you done it?',
        'Who benefits from you believing this?',
        'You distrust the media. Do you also distrust what confirms your distrust?'
      ]
    },
    {
      trigger: /\bzeit\b|keine zeit|aufmerksam|ablenk|konzentr|scroll|\bhandy\b|\btime\b|attention|distract|focus|phone/i,
      responses: [
        'Keine Zeit heißt: andere Prioritäten. Welche sind es?',
        'Wie lange denkst du am Stück, ohne zu prüfen, ob jemand geschrieben hat?',
        'Deine Aufmerksamkeit ist das Teuerste, was du hast. Wem schenkst du sie gerade?',
        'Was hast du heute zu Ende gedacht — nicht angefangen, zu Ende?',
        'Ablenkung ist bequem, weil Denken anstrengt. Womit lenkst du dich ab?',
        'Wenn du eine Stunde ungestört hättest: Womit? Ehrlich.',
        'Du sagst, es geht alles zu schnell. Was davon bestimmst du selbst?',
        'Langeweile ist der Anfang von Gedanken. Wann warst du zuletzt gelangweilt?'
      ],
      responsesEn: [
        'No time means: other priorities. Which ones?',
        'How long do you think without checking whether someone messaged you?',
        'Your attention is the most expensive thing you own. Who are you giving it to right now?',
        'What did you think through to the end today — not start, finish?',
        'Distraction is comfortable because thinking is hard. What do you distract yourself with?',
        'If you had one undisturbed hour: doing what? Honestly.',
        'You say everything moves too fast. How much of it do you set yourself?',
        'Boredom is where thoughts begin. When were you last bored?'
      ]
    },
    {
      trigger: /\bgeld\b|wirtschaft|\bmarkt\b|kapital|\bpreis\b|\bkost|money|econom|market|capital|price|\bcost/i,
      responses: [
        'Der Preis sagt, was etwas kostet. Was sagt er über den Wert?',
        'Was würdest du tun, wenn es sich nicht rechnen müsste?',
        'Du sagst, es lohnt sich nicht. Für wen und in welchem Zeitraum?',
        'Wer trägt die Kosten, die in deiner Rechnung nicht vorkommen?',
        'Billig wird, was sich kopieren lässt. Was an dir lässt sich nicht kopieren?',
        'Du willst mehr. Wie viel wäre genug — nenn eine Zahl.',
        'Sparen ist keine Haltung. Wofür sparst du?',
        'Der Markt entscheidet, heißt es. Wer ist „der Markt" in deinem Fall?'
      ],
      responsesEn: [
        'The price says what something costs. What does it say about its worth?',
        'What would you do if it did not have to pay off?',
        'You say it is not worth it. For whom, and over what period?',
        'Who carries the costs that do not appear in your calculation?',
        'Whatever can be copied becomes cheap. What about you cannot be copied?',
        'You want more. How much would be enough — name a number.',
        'Saving is not a stance. What are you saving for?',
        'The market decides, they say. Who is "the market" in your case?'
      ]
    },
    {
      trigger: /\bzukunft\b|\bklima\b|\bkrise\b|generation|nachhaltig|future|climate|crisis|sustainab|tomorrow/i,
      responses: [
        'Du sprichst von der Zukunft. Welche Entscheidung von heute steckt darin?',
        'Was tust du, obwohl du das Ergebnis nicht mehr erleben wirst?',
        'Weltuntergang und Weiter-so sind beide bequem. Was liegt dazwischen?',
        'Wenn es zu spät ist: Was wäre trotzdem richtig gewesen?',
        'Du erwartest, dass „man" etwas tut. Wer ist „man"?',
        'Hoffnung ohne Handlung ist Dekoration. Was ist deine Handlung?',
        'Welche Entscheidung von heute möchtest du in zwanzig Jahren erklären können?',
        'Katastrophenwissen macht nicht automatisch handlungsfähig. Was macht es bei dir?'
      ],
      responsesEn: [
        'You speak of the future. Which decision of today is inside it?',
        'What do you do even though you will not see the result?',
        'Doom and business-as-usual are both comfortable. What lies between them?',
        'If it is too late: what would still have been right?',
        'You expect that "someone" will act. Who is "someone"?',
        'Hope without action is decoration. What is your action?',
        'Which decision of today would you like to be able to explain in twenty years?',
        'Knowing about catastrophe does not automatically make you capable of acting. What does it do to you?'
      ]
    },
    {
      trigger: /\bwissenschaft\b|forsch|studie\b|\bexpert|beweis|scien|research|\bstudy\b|evidence|\bproof\b/i,
      responses: [
        'Eine Studie ist ein Argument, kein Urteil. Was ist deins?',
        'Du berufst dich auf Fachleute. Verstehst du, worauf die sich berufen?',
        'Wissenschaft irrt sich systematisch — das ist ihre Stärke. Wo darfst du dich irren?',
        'Was würde deine Position widerlegen? Wenn nichts: Ist sie dann noch prüfbar?',
        'Zahlen sind nicht neutral. Wer hat entschieden, was gezählt wird?',
        'Konsens ist kein Beweis. Aber er ist auch kein Zufall. Wie gehst du damit um?',
        'Du misstraust der Forschung. Woher stammt das Wissen für dieses Misstrauen?',
        'Zwischen „nicht bewiesen" und „widerlegt" liegt ein großer Unterschied. Welchen meinst du?'
      ],
      responsesEn: [
        'A study is an argument, not a verdict. What is yours?',
        'You cite experts. Do you understand what they are citing?',
        'Science errs systematically — that is its strength. Where are you allowed to err?',
        'What would refute your position? If nothing: can it still be tested?',
        'Numbers are not neutral. Who decided what gets counted?',
        'Consensus is not proof. But it is not an accident either. How do you handle that?',
        'You distrust research. Where does the knowledge for that distrust come from?',
        'Between "not proven" and "refuted" lies a large difference. Which do you mean?'
      ]
    },
    {
      trigger: /\bdemokr|demokratie|wahl|wählen|abstimm|democra|\bvote\b|voting|election/i,
      responses: [
        'Demokratie ist nicht nur Verfassungsrecht. Sie ist tägliche Übung im Dissens. Übst du?',
        'Wählen ist der Anfang. Urteilen ist die Arbeit dazwischen. Was tust du zwischen den Wahlen?',
        'Demokratie braucht Menschen, die Widerspruch aushalten. Wie viel hältst du aus?',
        'Demokratie stirbt nicht an Extremen. Sie stirbt an Gleichgültigkeit.',
        'Mehrheit heißt nicht recht. Was heißt es dann?',
        'Was tust du, wenn die Mehrheit gegen dich entscheidet — und das Verfahren korrekt war?',
        'Du willst Beteiligung. Wo hast du dich zuletzt beteiligt?',
        'Wer nur gewinnen will, braucht keine Demokratie. Wozu brauchst du sie?'
      ],
      responsesEn: [
        'Democracy is not just constitutional law. It is daily practice in dissent. Do you practise?',
        'Voting is the beginning. Judging is the work in between. What do you do between elections?',
        'Democracy needs people who can endure contradiction. How much can you endure?',
        'Democracy does not die from extremes. It dies from indifference.',
        'A majority is not the same as being right. So what is it?',
        'What do you do when the majority decides against you — and the procedure was correct?',
        'You want participation. Where did you last participate?',
        'Whoever only wants to win does not need democracy. What do you need it for?'
      ]
    },
    {
      trigger: /\bpolitik\b|politisch|partei|regierung|staat|politic|government|\bparty\b|\bstate\b/i,
      responses: [
        'Politik beginnt nicht im Parlament. Sie beginnt in dem Moment, wo du entscheidest, nicht gleichgültig zu sein.',
        'Du sagst Politik. Aber meinst du Machtspiel oder Gemeinwesen? Das ändert alles.',
        'Was wäre, wenn politisches Denken nicht heißt: Partei wählen — sondern: Urteil fällen?',
        'Die falsche Alternative: Anpassung oder Lager. Was wäre eine dritte Option?',
        'Du beschreibst ein Problem. Wer müsste was tun — konkret?',
        'Empörung ist schnell. Was von deiner Empörung hält bis morgen?',
        'Wenn du die Gegenseite beschreibst: Würde sie sich wiedererkennen?',
        'Politik heißt entscheiden unter Unsicherheit. Welche Entscheidung würdest du verantworten?'
      ],
      responsesEn: [
        'Politics does not begin in parliament. It begins the moment you decide not to be indifferent.',
        'You say politics. But do you mean power games or the common good? That changes everything.',
        'What if political thinking did not mean picking a party — but forming a judgment?',
        'The false alternative: conformity or camp. What would a third option be?',
        'You are describing a problem. Who would have to do what — concretely?',
        'Outrage is fast. How much of yours will last until tomorrow?',
        'When you describe the other side: would they recognise themselves?',
        'Politics means deciding under uncertainty. Which decision would you take responsibility for?'
      ]
    },
    {
      trigger: /\bkunst\b|kreativ|künstler|atelier|\bart\b|artist|creativ/i,
      responses: [
        'Das Atelier ist kein Elfenbeinturm. Es ist eine Werkstatt für Urteil. Was baust du?',
        'Kreativität ohne Urteil ist Dekoration. Was unterscheidet dein Schaffen vom Dekorieren?',
        'Kunst stellt Fragen, die niemand bestellt hat. Welche Frage stellst du?',
        'Im Atelier geht es nicht um Selbstverwirklichung. Es geht um Wirksamkeit.',
        'Wem nützt es? Und wenn niemandem — reicht dir das?',
        'Du willst dich ausdrücken. Was genau soll ankommen?',
        'Ein Werk, das niemand versteht, kann tief sein. Oder unfertig. Welches ist deins?',
        'Was riskierst du in deiner Arbeit?'
      ],
      responsesEn: [
        'The Atelier is not an ivory tower. It is a workshop for judgment. What are you building?',
        'Creativity without judgment is decoration. What distinguishes your work from decorating?',
        'Art asks questions nobody ordered. Which question are you asking?',
        'The Atelier is not about self-realisation. It is about effectiveness.',
        'Who does it serve? And if nobody — is that enough for you?',
        'You want to express yourself. What exactly should arrive?',
        'A work nobody understands can be deep. Or unfinished. Which is yours?',
        'What are you risking in your work?'
      ]
    },
    {
      trigger: /\bwort\b|\bbegriff|sprache|definier|\bwording\b|\bword\b|\bterm\b|language|define/i,
      responses: [
        'Du benutzt ein großes Wort. Definiere es in einem Satz.',
        'Wenn der Begriff unklar ist, ist der Streit darüber wertlos. Was meinst du genau?',
        'Wer den Begriff besetzt, gewinnt die Debatte. Wer hat deinen besetzt?',
        'Sag dasselbe noch einmal — ohne dieses eine Wort.',
        'Fremdwörter machen Sätze fest, nicht klar. Wie klingt deiner einfach?',
        'Was wäre das genaue Gegenteil dessen, was du gerade gesagt hast? Ergibt es Sinn?',
        'Ein Etikett erspart das Argument. Welches Argument ersparst du dir gerade?',
        'Erklär es, als wäre ich vierzehn. Was bleibt übrig?'
      ],
      responsesEn: [
        'You are using a big word. Define it in one sentence.',
        'If the term is unclear, the argument about it is worthless. What exactly do you mean?',
        'Whoever occupies the term wins the debate. Who occupied yours?',
        'Say the same thing again — without that one word.',
        'Jargon makes sentences solid, not clear. How does yours sound in plain words?',
        'What would be the exact opposite of what you just said? Does it make sense?',
        'A label saves you the argument. Which argument are you saving yourself right now?',
        'Explain it as if I were fourteen. What is left?'
      ]
    },
    {
      trigger: /\bmitte\b|mittig|zentrum|zentrist|middle|centre|center/i,
      responses: [
        'Mitte klingt bequem. Aber eine denkende Mitte ist unbequem — sie muss denken, wo andere nur reagieren.',
        'Welche Mitte meinst du? Die laue Äquidistanz oder die denkende Position?',
        'Die Mitte ist kein Ort. Sie ist eine Praxis. Was tust du konkret, um dort zu stehen?',
        'Wenn alle von Mitte reden, warum fühlt sich dann niemand vertreten?',
        'Mitte ist kein Kompromiss zwischen zwei Lagern. Was ist sie dann für dich?',
        'Sich nicht festzulegen ist bequem. Wo hast du dich zuletzt festgelegt?',
        'Zwischen allen Stühlen zu sitzen ist keine Haltung — es sei denn, du sagst warum.',
        'Wer in der Mitte steht, bekommt Widerspruch von zwei Seiten. Hältst du das aus?'
      ],
      responsesEn: [
        'The middle sounds comfortable. But a thinking middle is uncomfortable — it has to think where others merely react.',
        'Which middle do you mean? The tepid equidistance or the thinking position?',
        'The middle is not a place. It is a practice. What do you actually do to stand there?',
        'If everyone talks about the middle, why does nobody feel represented?',
        'The middle is not a compromise between two camps. So what is it to you?',
        'Not committing is comfortable. Where did you last commit?',
        'Sitting between all chairs is not a stance — unless you say why.',
        'Whoever stands in the middle gets contradicted from two sides. Can you take that?'
      ]
    },
    {
      trigger: /\bwiderspruch\b|widersprüch|kontrover|debatt|contradict|controver|debate|disagree/i,
      responses: [
        'Widerspruch ist keine Störung. Er ist Methode. Aber hältst du ihn auch aus, wenn er dich selbst trifft?',
        'Wem hast du zuletzt wirklich widersprochen — nicht im Netz, sondern im Raum?',
        'Interessant. Widerspruch erfordert Zuhören. Wie gut hörst du zu, bevor du antwortest?',
        'Widerspruch ohne Respekt ist Provokation. Widerspruch mit Respekt ist Denken.',
        'Wann hat dich zuletzt jemand widerlegt — und du warst dankbar?',
        'Suchst du Widerspruch oder jemanden, der dir recht gibt?',
        'Was müsste passieren, damit du deine Position aufgibst? Wenn nichts: Ist es dann eine Position?',
        'Der beste Einwand gegen dich — kennst du ihn? Formuliere ihn.'
      ],
      responsesEn: [
        'Contradiction is not a disturbance. It is a method. But can you bear it when it hits you?',
        'Who did you last truly contradict — not online, but in the room?',
        'Interesting. Contradiction requires listening. How well do you listen before you answer?',
        'Contradiction without respect is provocation. Contradiction with respect is thinking.',
        'When did someone last prove you wrong — and you were grateful?',
        'Are you looking for contradiction, or for someone who agrees with you?',
        'What would have to happen for you to drop your position? If nothing: is it a position at all?',
        'The strongest objection against you — do you know it? Put it into words.'
      ]
    },
    {
      trigger: /\bmeinung\b|meinungs|standpunkt|position|opinion|viewpoint|stance/i,
      responses: [
        'Eine Meinung haben ist billig. Eine Meinung begründen können ist teuer. Was kostet deine?',
        'Meinungen sind wie Reflexe — schnell da. Urteile brauchen Zeit. Hast du dir die genommen?',
        'Wann hast du zuletzt eine Meinung geändert, weil ein Argument besser war als deins?',
        'Meinungsfreiheit heißt nicht, dass jede Meinung gleich viel wert ist. Was unterscheidet sie?',
        'Woher weißt du das? Nicht: wer sagt es — woher weißt du es?',
        'Was müsste wahr sein, damit du falsch liegst?',
        'Deine Meinung oder die deines Umfelds? Der Unterschied ist prüfbar.',
        'Du hast eine Meinung. Hast du auch die Gegenargumente — in ihrer stärksten Form?'
      ],
      responsesEn: [
        'Having an opinion is cheap. Being able to justify one is expensive. What does yours cost?',
        'Opinions are like reflexes — instantly there. Judgments take time. Did you take it?',
        'When did you last change your mind because an argument was better than yours?',
        'Freedom of opinion does not mean every opinion is worth the same. What distinguishes them?',
        'How do you know? Not: who says so — how do you know?',
        'What would have to be true for you to be wrong?',
        'Your opinion or the one around you? That difference can be tested.',
        'You have an opinion. Do you also have the counterarguments — in their strongest form?'
      ]
    },
    {
      trigger: /\bfreiheit\b|frei\b|befreiung|autonom|freedom|liberty|\bfree\b/i,
      responses: [
        'Freiheit ohne Form kippt in Willkür. Was gibt deiner Freiheit Struktur?',
        'Frei wovon? Frei wozu? Das sind zwei verschiedene Fragen.',
        'Echte Freiheit erfordert Urteil. Sonst ist sie nur Reaktion auf den letzten Reiz.',
        'Wenn du frei bist, alles zu tun — warum tust du dann meistens dasselbe wie alle anderen?',
        'Was tust du nicht, obwohl du dürftest? Auch das ist Freiheit.',
        'Wer nur wählt, was ihm angeboten wird, ist nicht frei. Was wählst du außerhalb des Angebots?',
        'Freiheit ohne Verantwortung ist Bequemlichkeit mit gutem Namen.',
        'Deine Freiheit endet, wo eine andere beginnt. Wo genau liegt die Grenze in deinem Fall?'
      ],
      responsesEn: [
        'Freedom without form tips into arbitrariness. What gives your freedom structure?',
        'Free from what? Free for what? Those are two different questions.',
        'Real freedom requires judgment. Otherwise it is just a reaction to the latest stimulus.',
        'If you are free to do anything — why do you mostly do the same as everyone else?',
        'What do you not do, although you are allowed to? That is freedom too.',
        'Whoever only picks from what is offered is not free. What do you choose outside the offer?',
        'Freedom without responsibility is convenience with a good name.',
        'Your freedom ends where someone else’s begins. Where exactly is that line in your case?'
      ]
    },
    {
      trigger: /\burteil\b|urteils|bewert|einschätz|judgment|judgement|assess|evaluat/i,
      responses: [
        'Urteilskraft ist das Teuerste, was es gibt. Was investierst du in deine?',
        'Ein Urteil ist nicht dasselbe wie eine Meinung. Was ist der Unterschied für dich?',
        'Urteilen heißt: unterscheiden. Was hast du heute unterschieden?',
        'Billig wird Reproduktion. Teuer werden Urteil, Originalität und Mut. Wo stehst du?',
        'Ein Urteil kostet: Danach kannst du nicht mehr alles gleichzeitig meinen. Bist du bereit?',
        'Was war dein letztes Urteil, das dich etwas gekostet hat?',
        'Zwischen Reflex und Urteil liegt eine Pause. Wie lang war deine?',
        'Urteilen heißt auch: sich irren können. Wo könntest du dich hier irren?'
      ],
      responsesEn: [
        'Judgment is the most expensive thing there is. What do you invest in yours?',
        'A judgment is not the same as an opinion. What is the difference for you?',
        'To judge means to distinguish. What did you distinguish today?',
        'Reproduction becomes cheap. Judgment, originality and courage become expensive. Where do you stand?',
        'A judgment costs something: afterwards you cannot hold every view at once. Are you ready?',
        'What was your last judgment that cost you something?',
        'Between reflex and judgment there is a pause. How long was yours?',
        'To judge also means being able to be wrong. Where could you be wrong here?'
      ]
    },
    {
      trigger: /\bhandl|handlung|tun\b|aktion|aktiv|\bact\b|action|\bdoing\b/i,
      responses: [
        'Analyse ohne Konsequenz ist ein Stilmittel. Was folgt aus deinem Denken?',
        'Handeln unter Unsicherheit — das ist die eigentliche Prüfung. Bestehst du sie?',
        'Du sprichst vom Handeln. Aber handelst du aus Überzeugung oder aus Gewohnheit?',
        'Wirksamkeit statt Pose. Was war deine letzte wirksame Handlung?',
        'Was ist der kleinste Schritt, den du heute machen könntest — nicht irgendwann?',
        'Du weißt, was richtig wäre. Was hält dich auf?',
        'Über Handeln reden ist noch kein Handeln. Was hast du diese Woche getan?',
        'Wenn niemand zusieht: Tust du es trotzdem?'
      ],
      responsesEn: [
        'Analysis without consequence is a stylistic device. What follows from your thinking?',
        'Acting under uncertainty — that is the real test. Do you pass it?',
        'You speak of acting. But do you act out of conviction or out of habit?',
        'Impact over posture. What was your last effective action?',
        'What is the smallest step you could take today — not at some point?',
        'You know what would be right. What is stopping you?',
        'Talking about acting is not yet acting. What did you do this week?',
        'If nobody is watching: do you still do it?'
      ]
    },
    {
      trigger: /\bgesellschaft\b|sozial|zusammen|gemeinschaft|society|social|communit/i,
      responses: [
        'Gesellschaft entsteht nicht durch Konsens, sondern durch produktiven Dissens. Wo ist deiner?',
        'Niemand allein ist klug genug für die Gegenwart. Mit wem denkst du?',
        'Zusammenleben heißt: Widerspruch aushalten. Nicht: alle denken dasselbe.',
        'Was wäre, wenn Gesellschaft kein Problem ist, das man löst, sondern eine Spannung, die man aushält?',
        'Mit wem, der anders denkt, hast du zuletzt geredet — nicht diskutiert, geredet?',
        'Du sagst „die Gesellschaft". Meinst du auch dich?',
        'Was schuldest du Menschen, die du nie treffen wirst?',
        'Gemeinschaft entsteht durch Aushalten, nicht durch Übereinstimmung. Wen hältst du aus?'
      ],
      responsesEn: [
        'Society does not arise from consensus but from productive dissent. Where is yours?',
        'No one alone is wise enough for the present. Who do you think with?',
        'Living together means enduring contradiction. Not: everyone thinking the same.',
        'What if society is not a problem to be solved but a tension to be endured?',
        'Who that thinks differently did you last talk to — not argue with, talk to?',
        'You say "society". Do you mean yourself as well?',
        'What do you owe people you will never meet?',
        'Community comes from enduring one another, not from agreeing. Who do you endure?'
      ]
    },
    {
      trigger: /\bwahrheit\b|wahr\b|richtig|fakten|objektiv|truth|\btrue\b|facts|objective/i,
      responses: [
        'Wahrheit ist kein Besitz. Sie ist ein Prozess. Wie sieht dein Prozess aus?',
        'Fakten sind der Boden. Urteil ist das Gebäude. Was baust du darauf?',
        'Wer sagt: Ich habe die Wahrheit — hat aufgehört zu denken. Denkst du noch?',
        'Zwischen Wahrheit und Lüge gibt es nicht die laue Mitte. Es gibt die Prüfung.',
        'Was würdest du glauben, wenn es dir unangenehm wäre?',
        'Du hast recherchiert. Hast du auch gesucht, was gegen dich spricht?',
        'Eine Quelle ist keine Prüfung. Wie prüfst du?',
        'Zwischen „ich weiß es nicht" und „es ist beliebig" liegt die ganze Arbeit.'
      ],
      responsesEn: [
        'Truth is not a possession. It is a process. What does your process look like?',
        'Facts are the ground. Judgment is the building. What are you building on it?',
        'Whoever says \'I have the truth\' has stopped thinking. Are you still thinking?',
        'Between truth and lie there is no tepid middle. There is examination.',
        'What would you believe if it were inconvenient for you?',
        'You did your research. Did you also search for what speaks against you?',
        'A source is not an examination. How do you examine?',
        'Between "I do not know" and "anything goes" lies all the work.'
      ]
    },
    {
      trigger: /\bangst\b|furcht|sorge|unsicher|fear|afraid|worry|anxious|uncertain/i,
      responses: [
        'Unsicherheit ist kein Fehler. Sie ist der Normalzustand. Die Frage ist: Handelst du trotzdem?',
        'Angst vor Komplexität führt in Lager. Angst aushalten führt zu Urteil. Wo bist du?',
        'Sicherheit ist eine Illusion. Was bleibt, wenn du sie loslässt?',
        'Die Gegenwart ist überfordernd. Aber Überforderung kann der Anfang von Denken sein.',
        'Wovor genau? Benenne es — dann wird es kleiner oder klarer.',
        'Was wäre das Schlimmste? Und was käme danach?',
        'Angst ist ein Signal, keine Anweisung. Was sagt dir deine?',
        'Du musst dich nicht sicher fühlen, um zu handeln. Nur klar.'
      ],
      responsesEn: [
        'Uncertainty is not a flaw. It is the normal state. The question is: do you act anyway?',
        'Fear of complexity leads into camps. Enduring fear leads to judgment. Where are you?',
        'Security is an illusion. What remains when you let go of it?',
        'The present is overwhelming. But being overwhelmed can be the beginning of thinking.',
        'Afraid of what exactly? Name it — then it gets smaller or clearer.',
        'What would be the worst case? And what would come after it?',
        'Fear is a signal, not an instruction. What is yours telling you?',
        'You do not have to feel safe in order to act. Only clear.'
      ]
    },
    {
      trigger: /\bident|identität|wer bin ich|selbst|who am i|myself/i,
      responses: [
        'Identität ist kein Fundament. Sie ist ein Werk. Woran arbeitest du?',
        'Wer bist du, wenn du nicht in ein Lager passt? Vielleicht: endlich frei.',
        'Identität durch Abgrenzung ist billig. Identität durch Urteil ist schwer. Was wählst du?',
        'Nicht angepasst. Nicht im Lager. Handlungsfähig. Reicht dir das als Identität?',
        'Wer wärst du ohne die Gruppe, die dich bestätigt?',
        'Du beschreibst, wozu du gehörst. Beschreib, wofür du stehst.',
        'Was an dir bliebe, wenn niemand zusieht?',
        'Zugehörigkeit ist warm. Urteil ist einsam. Wie viel brauchst du von beidem?'
      ],
      responsesEn: [
        'Identity is not a foundation. It is a work. What are you working on?',
        'Who are you if you don\'t fit into a camp? Perhaps: finally free.',
        'Identity through demarcation is cheap. Identity through judgment is hard. Which do you choose?',
        'Not conforming. Not in a camp. Capable of action. Is that enough of an identity for you?',
        'Who would you be without the group that confirms you?',
        'You describe what you belong to. Now describe what you stand for.',
        'What part of you would remain if nobody were watching?',
        'Belonging is warm. Judgment is lonely. How much of each do you need?'
      ]
    },
    {
      trigger: /\bsinn\b|sinnlos|glaube\b|religio|spirit|hoffnung|\btod\b|meaning|purpose|belie|faith|\bhope\b|death/i,
      responses: [
        'Sinn wird nicht gefunden, sondern gemacht. Woran arbeitest du?',
        'Wenn nichts einen Sinn hätte: Was würdest du trotzdem tun?',
        'Du suchst eine Antwort. Vielleicht suchst du eine bessere Frage.',
        'Was hältst du für wahr, ohne es beweisen zu können? Und weißt du das von dir?',
        'Zweifel ist kein Gegner der Überzeugung. Er ist ihr Prüfstein.',
        'Wofür würdest du Unbequemlichkeit in Kauf nehmen?',
        'Was bliebe von dir, wenn niemand sich erinnert?',
        'Sinn entsteht selten allein. Mit wem teilst du deinen?'
      ],
      responsesEn: [
        'Meaning is not found, it is made. What are you working on?',
        'If nothing had meaning: what would you still do?',
        'You are looking for an answer. Perhaps you are looking for a better question.',
        'What do you hold to be true without being able to prove it? And do you know that about yourself?',
        'Doubt is not the enemy of conviction. It is its test.',
        'What would you accept discomfort for?',
        'What would remain of you if nobody remembered?',
        'Meaning rarely arises alone. Who do you share yours with?'
      ]
    }
  ];

  var genericResponses = [
    'Interessant. Aber was genau meinst du damit? Sag es präziser.',
    'Das klingt nach einer Position. Aber hast du sie geprüft oder nur gefühlt?',
    'Und was folgt daraus? Denken ohne Konsequenz ist Luxus.',
    'Spannend. Jetzt dreh den Gedanken einmal um. Was wäre das Gegenteil?',
    'Wer hat dich davon überzeugt? Und warum glaubst du dieser Person?',
    'Zu einfach. Die Wirklichkeit ist komplizierter. Wo ist der Widerspruch in deinem Argument?',
    'Nicht mehr Stoff. Mehr Urteil. Was ist dein Urteil — nicht deine Meinung?',
    'Stell dir vor, du müsstest das Gegenteil verteidigen. Könntest du?',
    'Das ist ein Anfang. Aber ein Anfang reicht nicht. Was kommt nach dem ersten Impuls?',
    'Mut wäre jetzt: den Gedanken zu Ende denken, auch wenn es unbequem wird.',
    'Das ist eine Antwort auf eine andere Frage. Was ist deine?',
    'Woran würdest du merken, dass du dich irrst?',
    'Was lässt du gerade weg, weil es unbequem ist?',
    'Sag es in einem Satz. Ohne Nebensatz.',
    'Du beschreibst, wie es ist. Sag, wie es sein sollte — und warum ausgerechnet so.',
    'Wem würde dein Gedanke wehtun? Und ist das ein Argument dagegen?',
    'Ist das dein Gedanke oder einer, den du übernommen hast?',
    'Angenommen, du hast recht. Was folgt daraus für morgen früh?',
    'Das ist die halbe Wahrheit. Wo ist die andere Hälfte?',
    'Du hast eine Position. Jetzt die schwierige Frage: Was spricht dagegen?'
  ];

  var genericResponsesEn = [
    'Interesting. But what exactly do you mean? Say it more precisely.',
    'That sounds like a position. But have you examined it or only felt it?',
    'And what follows from it? Thinking without consequence is a luxury.',
    'Intriguing. Now turn the thought around. What would the opposite be?',
    'Who convinced you of that? And why do you believe that person?',
    'Too simple. Reality is more complicated. Where is the contradiction in your argument?',
    'Not more material. More judgment. What is your judgment — not your opinion?',
    'Imagine you had to defend the opposite. Could you?',
    'That is a start. But a start is not enough. What comes after the first impulse?',
    'Courage now would be: thinking the thought through to the end, even where it gets uncomfortable.',
    'That is an answer to a different question. What is yours?',
    'How would you notice that you are wrong?',
    'What are you leaving out because it is uncomfortable?',
    'Say it in one sentence. Without a subclause.',
    'You describe how it is. Say how it should be — and why exactly that way.',
    'Who would your thought hurt? And is that an argument against it?',
    'Is that your thought or one you adopted?',
    'Suppose you are right. What follows from it for tomorrow morning?',
    'That is half the truth. Where is the other half?',
    'You have a position. Now the hard question: what speaks against it?'
  ];

  function isEn() {
    return ((window.AtelierI18n && window.AtelierI18n.lang) || 'de') === 'en';
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Zwei gleiche Antworten hintereinander entlarven den Hausvorrat
  // sofort — einmal neu ziehen genügt bei acht Varianten je Gruppe.
  function pickFresh(arr) {
    var choice = pick(arr);
    if (choice === lastFallback && arr.length > 1) choice = pick(arr);
    lastFallback = choice;
    return choice;
  }

  function localFallback(userText) {
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].trigger.test(userText)) {
        return pickFresh(isEn() ? triggers[i].responsesEn : triggers[i].responses);
      }
    }
    return pickFresh(isEn() ? genericResponsesEn : genericResponses);
  }

  function findResponse(userText, callback) {
    fetch(((typeof window !== 'undefined' && window.ATELIER_API_BASE) ? window.ATELIER_API_BASE : '') + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, history: history, lang: (window.AtelierI18n && window.AtelierI18n.lang) || 'de' })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.reply) {
        callback(data.reply, false);
      } else {
        callback(localFallback(userText), true);
      }
    })
    .catch(function () {
      callback(localFallback(userText), true);
    });
  }

  function addMessage(text, sender, note) {
    if (!messagesEl) return;

    var msg = document.createElement('div');
    msg.className = 'chat-message ' + (sender === 'user' ? 'chat-message--user' : 'chat-message--bot');

    if (note) {
      var noteEl = document.createElement('span');
      noteEl.className = 'chat-message-note';
      noteEl.textContent = note;
      msg.appendChild(noteEl);
    }

    var textEl = document.createElement('span');
    textEl.className = 'chat-message-text';
    textEl.textContent = text;
    msg.appendChild(textEl);

    messagesEl.appendChild(msg);

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Fade in
    requestAnimationFrame(function () {
      msg.classList.add('is-visible');
    });

    history.push({ sender: sender, text: text });
  }

  function handleSend() {
    if (!inputEl) return;
    var text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    addMessage(text, 'user');

    // Call API with local fallback
    findResponse(text, function (response, isFallback) {
      var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
      addMessage(response, 'bot', isFallback ? t('chat.offlineNote') : null);
    });
  }

  function resetChat() {
    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    history = [];
    if (messagesEl) {
      messagesEl.innerHTML = '';
    }
    addMessage(t('chat.welcome'), 'bot');
  }

  function toggleChat() {
    chatOpen = !chatOpen;
    if (chatEl) {
      if (chatOpen) {
        chatEl.classList.add('is-open');
      } else {
        chatEl.classList.remove('is-open');
      }
    }
    if (chatOpen && inputEl) {
      inputEl.focus();
    } else {
      var fab = document.getElementById('chat-fab');
      if (fab) fab.focus();
    }
  }

  function buildUI() {
    // Floating button
    var fab = document.createElement('button');
    fab.id = 'chat-fab';
    fab.className = 'chat-fab';
    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    fab.setAttribute('aria-label', t('chat.fabLabel'));
    fab.textContent = t('chat.fabText');
    fab.addEventListener('click', toggleChat);

    // Chat window
    chatEl = document.createElement('div');
    chatEl.id = 'chat-window';
    chatEl.className = 'chat-window';
    chatEl.setAttribute('role', 'dialog');
    chatEl.setAttribute('aria-label', t('chat.title'));

    // Header
    var header = document.createElement('div');
    header.className = 'chat-header';

    var title = document.createElement('span');
    title.textContent = t('chat.title');

    var headerBtns = document.createElement('div');
    headerBtns.className = 'chat-header-buttons';

    var resetBtn = document.createElement('button');
    resetBtn.textContent = t('chat.newConvo');
    resetBtn.className = 'chat-header-btn';
    resetBtn.addEventListener('click', resetChat);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', t('chat.closeLabel'));
    closeBtn.className = 'chat-header-btn chat-header-btn--close';
    closeBtn.addEventListener('click', toggleChat);

    headerBtns.appendChild(resetBtn);
    headerBtns.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(headerBtns);

    // Messages area
    messagesEl = document.createElement('div');
    messagesEl.className = 'chat-messages';
    messagesEl.setAttribute('role', 'log');
    messagesEl.setAttribute('aria-live', 'polite');
    messagesEl.setAttribute('aria-label', t('chat.messagesLabel'));

    // Input area
    var inputArea = document.createElement('div');
    inputArea.className = 'chat-input-area';

    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'chat-input';
    inputEl.placeholder = t('chat.placeholder');
    inputEl.setAttribute('aria-label', t('chat.inputLabel'));

    var sendBtn = document.createElement('button');
    sendBtn.textContent = t('chat.send');
    sendBtn.className = 'chat-send-btn';
    sendBtn.setAttribute('aria-label', t('chat.sendLabel'));

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });

    inputArea.appendChild(inputEl);
    inputArea.appendChild(sendBtn);

    chatEl.appendChild(header);
    chatEl.appendChild(messagesEl);
    chatEl.appendChild(inputArea);

    document.body.appendChild(fab);
    document.body.appendChild(chatEl);

    // Escape key closes chat
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && chatOpen) {
        toggleChat();
      }
    });

    // Focus trap inside chat dialog
    chatEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = chatEl.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  function init() {
    buildUI();
    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    addMessage(t('chat.welcome'), 'bot');
  }

  window.AtelierChat = {
    init: init
  };
}());
