const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { inject, uninject } = require('powercord/injector');

class ScrollableAutocomplete extends Plugin {
  async startPlugin () {
    this.classes = {
      ...await getModule([ 'scrollbar', 'scrollerWrap' ]),
      ...await getModule([ 'autocompleteRow', 'selectorSelected' ])
    };

    this.patchAutocomplete();
    this.patchAutocompleteSelection();

    this.results = await getModule([ 'queryEmojiResults' ]);
    this.results.__oldQueryEmojiResults = this.results.queryEmojiResults;
    this.results.queryEmojiResults = function (e, t) {
      const emojis = getModule([ 'initialize', 'search' ], false).search(t, e);

      return { emojis };
    };

    this.reloadEmojiUtility();
  }

  async patchAutocomplete () {
    const { classes } = this;
    const VerticalScroller = await getModuleByDisplayName('VerticalScroller');
    const Autocomplete = await getModuleByDisplayName('Autocomplete');
    inject('scrollableAutocomplete-scrollbar', Autocomplete.prototype, 'render', function (_, res) {
      if (this.props.children) {
        const autocompletes = this.props.children[1];

        if (autocompletes.length > 10) {
          this.props.children[1] = React.createElement(VerticalScroller, {
            className: classes.scroller,
            theme: classes.themeGhostHairline,
            style: { height: '360px' }
          }, autocompletes);
        }
      }

      return res;
    });
  }

  async patchAutocompleteSelection () {
    const { classes } = this;
    const ChannelTextArea = await getModuleByDisplayName('ChannelTextArea');
    inject('scrollableAutocomplete-selection', ChannelTextArea.prototype, 'moveSelection', function (args, res) {
      const direction = args[0];
      const selection = this.state.selectedAutocomplete;
      const selectedAutocomplete = document.querySelector(`.${classes.selectorSelected.split(' ')[0]}`);
      const scroller = selectedAutocomplete.parentNode.parentNode;

      if (selection + direction >= this.getAutocompletes().length) {
        scroller.scrollTop = 0;
      } else if (selection + direction < 0) {
        scroller.scrollTop = scroller.scrollHeight;
      } else {
        scroller.scrollTop = selectedAutocomplete.offsetTop - 32;
      }

      return res;
    });

    inject('scrollableAutocomplete-selectTop', ChannelTextArea.prototype, 'componentDidUpdate', (args) => {
      const state = args[1];

      if (!state.autocompleteType && !state.selectedAutocomplete !== 0) {
        state.selectedAutocomplete = 0;
      }

      return args;
    });
  }

  pluginWillUnload () {
    this.results.queryEmojiResults = this.results.__oldQueryEmojiResults;

    uninject('scrollableAutocomplete-scrollbar');
    uninject('scrollableAutocomplete-selection');
    uninject('scrollableAutocomplete-selectTop');

    this.reloadEmojiUtility();
  }

  reloadEmojiUtility () {
    if (powercord.pluginManager.get('pc-emojiUtility')) {
      if (powercord.pluginManager.isEnabled('pc-emojiUtility')) {
        powercord.pluginManager.remount('pc-emojiUtility');
      }
    }
  }
}

module.exports = ScrollableAutocomplete;
