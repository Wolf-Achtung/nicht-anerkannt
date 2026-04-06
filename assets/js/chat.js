/**
 * chat.js — KI-Sparringspartner Chat Widget
 * Das Atelier der Radikalen Mitte
 * Local fallback with Socratic counter-questions. Placeholder for future API.
 */
(function () {
  'use strict';

  var chatOpen = false;
  var chatEl = null;
  var messagesEl = null;
  var inputEl = null;
  var history = [];

  var triggers = [
    {
      trigger: /\bki\b|k\.i\.|künstliche.?intelligenz|artificial/i,
      responses: [
        'Wenn KI alles beantworten kann — was ist dann noch deine Frage wert?',
        'Du sagst KI. Aber meinst du Werkzeug oder Ersatz? Das ist nicht dasselbe.',
        'KI produziert Output. Wer produziert das Urteil darüber?',
        'Interessant, dass du KI erwähnst. Hast du heute schon etwas gedacht, das keine Maschine denken könnte?'
      ]
    },
    {
      trigger: /\bbildung\b|lernen|schule|universit|studier/i,
      responses: [
        'Bildung gegen was? Gegen Unwissenheit oder gegen Urteilslosigkeit? Das sind verschiedene Kämpfe.',
        'Was wäre, wenn Bildung nicht mehr heißt: Stoff aufnehmen — sondern: unterscheiden lernen?',
        'Du sprichst von Bildung. Aber wann hat dich zuletzt etwas Gelerntes wirklich verändert?',
        'Prüfungen messen Reproduktion. Was misst Urteilskraft?'
      ]
    },
    {
      trigger: /\bmitte\b|mittig|zentrum|zentrist/i,
      responses: [
        'Mitte klingt bequem. Aber die Radikale Mitte ist unbequem — sie muss denken, wo andere nur reagieren.',
        'Welche Mitte meinst du? Die laue Äquidistanz oder die denkende Position?',
        'Die Mitte ist kein Ort. Sie ist eine Praxis. Was tust du konkret, um dort zu stehen?',
        'Wenn alle von Mitte reden, warum fühlt sich dann niemand vertreten?'
      ]
    },
    {
      trigger: /\bwiderspruch\b|widersprüch|kontrover|debatt/i,
      responses: [
        'Widerspruch ist keine Störung. Er ist Methode. Aber hältst du ihn auch aus, wenn er dich selbst trifft?',
        'Wem hast du zuletzt wirklich widersprochen — nicht im Netz, sondern im Raum?',
        'Interessant. Widerspruch erfordert Zuhören. Wie gut hörst du zu, bevor du antwortest?',
        'Widerspruch ohne Respekt ist Provokation. Widerspruch mit Respekt ist Denken.'
      ]
    },
    {
      trigger: /\bpolitik\b|politisch|partei|regierung|staat/i,
      responses: [
        'Politik beginnt nicht im Parlament. Sie beginnt in dem Moment, wo du entscheidest, nicht gleichgültig zu sein.',
        'Du sagst Politik. Aber meinst du Machtspiel oder Gemeinwesen? Das ändert alles.',
        'Was wäre, wenn politisches Denken nicht heißt: Partei wählen — sondern: Urteil fällen?',
        'Die falsche Alternative: Anpassung oder Lager. Was wäre eine dritte Option?'
      ]
    },
    {
      trigger: /\bmeinung\b|meinungs|standpunkt|position/i,
      responses: [
        'Eine Meinung haben ist billig. Eine Meinung begründen können ist teuer. Was kostet deine?',
        'Meinungen sind wie Reflexe — schnell da. Urteile brauchen Zeit. Hast du dir die genommen?',
        'Wann hast du zuletzt eine Meinung geändert, weil ein Argument besser war als deins?',
        'Meinungsfreiheit heißt nicht, dass jede Meinung gleich viel wert ist. Was unterscheidet sie?'
      ]
    },
    {
      trigger: /\bfreiheit\b|frei\b|befreiung|autonom/i,
      responses: [
        'Freiheit ohne Form kippt in Willkür. Was gibt deiner Freiheit Struktur?',
        'Frei wovon? Frei wozu? Das sind zwei verschiedene Fragen.',
        'Echte Freiheit erfordert Urteil. Sonst ist sie nur Reaktion auf den letzten Reiz.',
        'Wenn du frei bist, alles zu tun — warum tust du dann meistens dasselbe wie alle anderen?'
      ]
    },
    {
      trigger: /\burteil\b|urteils|bewert|einschätz/i,
      responses: [
        'Urteilskraft ist das Teuerste, was es gibt. Was investierst du in deine?',
        'Ein Urteil ist nicht dasselbe wie eine Meinung. Was ist der Unterschied für dich?',
        'Urteilen heißt: unterscheiden. Was hast du heute unterschieden?',
        'Billig wird Reproduktion. Teuer werden Urteil, Originalität und Mut. Wo stehst du?'
      ]
    },
    {
      trigger: /\bhandl|handlung|tun\b|aktion|aktiv/i,
      responses: [
        'Analyse ohne Konsequenz ist ein Stilmittel. Was folgt aus deinem Denken?',
        'Handeln unter Unsicherheit — das ist die eigentliche Prüfung. Bestehst du sie?',
        'Du sprichst vom Handeln. Aber handelst du aus Überzeugung oder aus Gewohnheit?',
        'Wirksamkeit statt Pose. Was war deine letzte wirksame Handlung?'
      ]
    },
    {
      trigger: /\bgesellschaft\b|sozial|zusammen|gemeinschaft/i,
      responses: [
        'Gesellschaft entsteht nicht durch Konsens, sondern durch produktiven Dissens. Wo ist deiner?',
        'Niemand allein ist klug genug für die Gegenwart. Mit wem denkst du?',
        'Zusammenleben heißt: Widerspruch aushalten. Nicht: alle denken dasselbe.',
        'Was wäre, wenn Gesellschaft kein Problem ist, das man löst, sondern eine Spannung, die man aushält?'
      ]
    },
    {
      trigger: /\bwahrheit\b|wahr\b|richtig|fakten|objektiv/i,
      responses: [
        'Wahrheit ist kein Besitz. Sie ist ein Prozess. Wie sieht dein Prozess aus?',
        'Fakten sind der Boden. Urteil ist das Gebäude. Was baust du darauf?',
        'Wer sagt: Ich habe die Wahrheit — hat aufgehört zu denken. Denkst du noch?',
        'Zwischen Wahrheit und Lüge gibt es nicht die laue Mitte. Es gibt die Prüfung.'
      ]
    },
    {
      trigger: /\bangst\b|furcht|sorge|unsicher/i,
      responses: [
        'Unsicherheit ist kein Fehler. Sie ist der Normalzustand. Die Frage ist: Handelst du trotzdem?',
        'Angst vor Komplexität führt in Lager. Angst aushalten führt zu Urteil. Wo bist du?',
        'Sicherheit ist eine Illusion. Was bleibt, wenn du sie loslässt?',
        'Die Gegenwart ist überfordernd. Aber Überforderung kann der Anfang von Denken sein.'
      ]
    },
    {
      trigger: /\bident|identität|wer bin ich|selbst/i,
      responses: [
        'Identität ist kein Fundament. Sie ist ein Werk. Woran arbeitest du?',
        'Wer bist du, wenn du nicht in ein Lager passt? Vielleicht: endlich frei.',
        'Identität durch Abgrenzung ist billig. Identität durch Urteil ist schwer. Was wählst du?',
        'Nicht angepasst. Nicht im Lager. Handlungsfähig. Reicht dir das als Identität?'
      ]
    },
    {
      trigger: /\bdemokr|demokratie|wahl|wählen|abstimm/i,
      responses: [
        'Demokratie ist nicht nur Verfassungsrecht. Sie ist tägliche Übung im Dissens. Übst du?',
        'Wählen ist der Anfang. Urteilen ist die Arbeit dazwischen. Was tust du zwischen den Wahlen?',
        'Demokratie braucht Menschen, die Widerspruch aushalten. Wie viel hältst du aus?',
        'Demokratie stirbt nicht an Extremen. Sie stirbt an Gleichgültigkeit.'
      ]
    },
    {
      trigger: /\bkunst\b|kreativ|künstler|atelier/i,
      responses: [
        'Das Atelier ist kein Elfenbeinturm. Es ist eine Werkstatt für Urteil. Was baust du?',
        'Kreativität ohne Urteil ist Dekoration. Was unterscheidet dein Schaffen vom Dekorieren?',
        'Kunst stellt Fragen, die niemand bestellt hat. Welche Frage stellst du?',
        'Im Atelier geht es nicht um Selbstverwirklichung. Es geht um Wirksamkeit.'
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
    'Mut wäre jetzt: den Gedanken zu Ende denken, auch wenn es unbequem wird.'
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function localFallback(userText) {
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].trigger.test(userText)) {
        return pick(triggers[i].responses);
      }
    }
    return pick(genericResponses);
  }

  function findResponse(userText, callback) {
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, history: history })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      callback(data.reply || localFallback(userText));
    })
    .catch(function () {
      callback(localFallback(userText));
    });
  }

  function addMessage(text, sender) {
    if (!messagesEl) return;

    var msg = document.createElement('div');
    msg.className = 'chat-message ' + (sender === 'user' ? 'chat-message--user' : 'chat-message--bot');

    msg.innerHTML = escapeHtml(text);
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
    findResponse(text, function (response) {
      addMessage(response, 'bot');
    });
  }

  function resetChat() {
    history = [];
    if (messagesEl) {
      messagesEl.innerHTML = '';
    }
    addMessage('Willkommen im Sparring. Sag mir, was dich beschäftigt — ich werde nicht nett sein, sondern ehrlich.', 'bot');
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
    fab.setAttribute('aria-label', 'KI-Sparring öffnen');
    fab.textContent = 'KI-Sparring';
    fab.addEventListener('click', toggleChat);

    // Chat window
    chatEl = document.createElement('div');
    chatEl.id = 'chat-window';
    chatEl.className = 'chat-window';
    chatEl.setAttribute('role', 'dialog');
    chatEl.setAttribute('aria-label', 'KI-Sparringspartner Chat');

    // Header
    var header = document.createElement('div');
    header.className = 'chat-header';

    var title = document.createElement('span');
    title.textContent = 'KI-Sparringspartner';

    var headerBtns = document.createElement('div');
    headerBtns.className = 'chat-header-buttons';

    var resetBtn = document.createElement('button');
    resetBtn.textContent = 'Neues Gespräch';
    resetBtn.className = 'chat-header-btn';
    resetBtn.addEventListener('click', resetChat);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('aria-label', 'Chat schließen');
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
    messagesEl.setAttribute('aria-label', 'Chat-Nachrichten');

    // Input area
    var inputArea = document.createElement('div');
    inputArea.className = 'chat-input-area';

    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'chat-input';
    inputEl.placeholder = 'Was denkst du?';
    inputEl.setAttribute('aria-label', 'Nachricht eingeben');

    var sendBtn = document.createElement('button');
    sendBtn.textContent = 'Senden';
    sendBtn.className = 'chat-send-btn';
    sendBtn.setAttribute('aria-label', 'Nachricht senden');

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
    addMessage('Willkommen im Sparring. Sag mir, was dich beschäftigt — ich werde nicht nett sein, sondern ehrlich.', 'bot');
  }

  window.AtelierChat = {
    init: init
  };
}());
