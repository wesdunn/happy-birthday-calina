; (function (window, document, undefined) {

  // UI
  // Handles prompt input, display, etc
  function UI(initial_prompt) {
    this.updatePrompt = function (blank) {
      var parts = blank.split(':');
      var type = parts[0],
        replacer = parts[1];

      if (type.match(/^another/)) {
        var article = '';
      } else {
        var article = 'a' + (type.match(/^[aeio]/i) ? 'n' : '');
      }
      prompt.innerHTML = article + ' <em class="word-class">' + type + '</em>';
      input.name = replacer;
    };

    this.clearInput = function () {
      input.value = '';
    };

    this.revealStory = function (text) {
      form.classList.add('complete');
      story.innerHTML = text;
    };

    var form = document.getElementById('mad-libs'),
      story = document.querySelector('#story .content'),
      prompt = form.querySelector('.prompt'),
      input = form.querySelector('input#word');

    form.addEventListener('submit', function (evt) {
      evt.preventDefault();
      this.onSubmit.call(this, { 'name': input.name, 'value': input.value });
      this.clearInput();
    }.bind(this));

    story.parentNode.querySelector('a.start-over').addEventListener('click', function (evt) {
      evt.preventDefault();
      window.location.hash = '';
      window.location.reload();
    });

    this.onSubmit = function () { };
    this.updatePrompt(initial_prompt);
  }

  // Story
  // handles input story parsing, progression of prompts
  // address bar hash = handling reloads, maybe sharing
  // TODO: add sharing
  function Story(text) {
    // splits input text based on {{ partOfSpeech:wordToReplace }}
    // parsed is an array based on the split. 
    // ALL ODD INDICES are the text to replace
    var MUSTACHE_REGEX = /{{\s?([^}]*)\s?}}/g,
      parsed = text.split(MUSTACHE_REGEX),
      blanks = [],
      // Should be a key/value of "blanks" to allow single user input
      // for multiple story replacements
      // could get these from odd numbered indices in `blanks`
      tags = new Map(),
      current_blank = 1;

    this.fillBlank = function (fill_with) {
      tags.set(fill_with.name, fill_with.value);
      blanks.push(fill_with.value);
      current_blank += 2;
    };

    this.getCurrentBlank = function () {
      var blank = parsed[current_blank];
      if (!blank) return false;
      var replacer = blank.split(':')[1];
      // Already filled for this...
      if (tags.has(replacer)) {
        blanks.push(tags.get(replacer));
        current_blank += 2;
        blank = parsed[current_blank];
      }
      return blank ? blank : false;
    };

    this.compile = function () {
      var index = 0;
      return text.replace(MUSTACHE_REGEX, function (match, submatch) {
        var prompt = submatch.split(':');
        return '<i title="' + prompt[1] + ' (' + prompt[0] + ')">' + blanks[index++] + '</i>';
      });
    };

    this.loadFromEncoded = function (base64) {
      try {
        blanks = this.decode(base64).split(',');
        // Make sure we retrieved a valid number of words from b64
        return Math.floor(parsed.length / blanks.length) <= 2;
      } catch (e) {
        return false;
      }
    };

    this.encode = function () {
      return encodeURIComponent(escape(blanks));
    };

    this.decode = function (encoded) {
      return unescape(decodeURIComponent(encoded));
    }
  }

  // App
  const stories = [window.STORY1, window.STORY2, window.STORY3];
  var template,
    story,
    storySelected;

  function pickStory(pick) {
    storySelected = pick.target.value;
    init(stories[storySelected - 1]);
  }

  function init(picked) {
    if (!picked) window.location = '';
    document.getElementById('picker').classList.add('hidden');
    document.getElementById('mad-libs').classList.remove('hidden');

    story = new Story(picked);
    template = new UI(story.getCurrentBlank() || '');
    template.onSubmit = enteredWord;

    var hash = window.location.hash.substr(1);
    if (hash && story.loadFromEncoded(hash)) {
      template.revealStory(story.compile());
    } else {
      window.location.hash = '';
    }
  }

  function enteredWord(filler) {
    story.fillBlank(filler);
    var next = story.getCurrentBlank();

    if (next) {
      template.updatePrompt(next);
    } else {
      if (history.pushState) {
        var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?story=${storySelected}`;
        window.history.pushState({ path: newurl }, '', newurl);
      }
      window.location.hash = story.encode();
      template.revealStory(story.compile());
    }
  }

  var params = new URLSearchParams(window.location.search);
  var hash = window.location.hash.substr(1);
  if (params.has('story') && hash) {
    init(stories[parseInt(params.get('story')) - 1])
  } else {
    document.getElementById('picker').addEventListener('click', pickStory);
  }

})(window, document);
