const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { inject, uninject } = require('powercord/injector');

let classes;
setImmediate(async () => {
  classes = {
    ...await getModule([ 'scrollbar', 'scrollerWrap' ]),
    ...await getModule([ 'autocompleteRow', 'selectorSelected' ])
  };
});

class ScrollableAutocomplete extends Plugin {
  async startPlugin () {
    this.patchAutocomplete();
    this.patchAutocompleteSelection();

    this.results = await getModule([ 'queryEmojiResults' ]);
    this.results.__oldQueryEmojiResults = this.results.queryEmojiResults;
    this.results.queryEmojiResults = function (query, channel) {
      return { emojis: getModule([ 'initialize', 'search' ], false).search(channel, query) };
    };

    this.reloadEmojiUtility();
  }

  async patchAutocomplete () {
    const Scroller = await getModule([ 'AdvancedScrollerThin' ]);
    const Autocomplete = await getModuleByDisplayName('Autocomplete');
    inject('scrollableAutocomplete-scrollbar', Autocomplete.prototype, 'render', function (_, res) {
      if (this.props.children) {
        const autocompletes = this.props.children[1];

        if (autocompletes && autocompletes.length > 10) {
          this.props.children[1] = React.createElement(Scroller.AdvancedScrollerThin, {
            fade: true,
            style: { height: '360px' }
          }, autocompletes);
        }
      }

      return res;
    });
  }

  async patchAutocompleteSelection () {
    const ChannelEditorContainer = await getModuleByDisplayName('ChannelEditorContainer');
    inject('scrollableAutocomplete-selection', ChannelEditorContainer.prototype, 'render', function (_, res) {
      const { autocompleteRef } = this.props;

      if (autocompleteRef.current) {
        const autocomplete = autocompleteRef.current;
        const { moveSelection } = autocomplete;

        autocomplete.moveSelection = (direction) => {
          const selectedAutocomplete = document.querySelector(`.${classes.selectorSelected.split(' ')[0]}`);

          if (selectedAutocomplete) {
            const scroller = selectedAutocomplete.parentNode.parentNode;

            if (autocomplete.state.selectedAutocomplete + direction >= autocomplete.getAutocompletes().length) {
              scroller.scrollTop = 0;
            } else if (autocomplete.state.selectedAutocomplete + direction < 0) {
              scroller.scrollTop = scroller.scrollHeight;
            } else {
              scroller.scrollTop = selectedAutocomplete.offsetTop - 32;
            }
          }

          return moveSelection(direction);
        };
      }

      return res;
    });

    const ChannelAutocomplete = await getModuleByDisplayName('ChannelAutocomplete');
    inject('scrollableAutocomplete-selectTop', ChannelAutocomplete.prototype, 'componentDidUpdate', (args) => {
      const state = args[1];
      state.selectedAutocomplete = 0;

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
