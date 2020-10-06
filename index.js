const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { AdvancedScrollerThin } = require('powercord/components');
const { inject, uninject } = require('powercord/injector');
const { findInReactTree } = require('powercord/util');

class ScrollableAutocomplete extends Plugin {
  constructor () {
    super();

    this.classes = {
      ...getModule([ 'scrollbar', 'scrollerWrap' ], false),
      ...getModule([ 'autocomplete', 'autocompleteInner' ], false)
    };
  }

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
    const Autocomplete = await getModuleByDisplayName('Autocomplete');
    inject('scrollableAutocomplete-scrollbar', Autocomplete.prototype, 'render', (_, res) => {
      const autocompleteInner = findInReactTree(res, n => Array.isArray(n));
      if (autocompleteInner && autocompleteInner[0]) {
        const autocompletes = autocompleteInner[0].props.children[1];

        if (autocompletes && autocompletes.length > 10 && !autocompleteInner[0].props.children[1].style) {
          autocompleteInner[0].props.children[1] = React.createElement(AdvancedScrollerThin, {
            style: { height: '360px' }
          }, autocompletes);
        }
      }

      return res;
    });
  }

  async patchAutocompleteSelection () {
    const ChannelTextAreaContainer = await getModule(m => m.type && m.type.render && m.type.render.displayName === 'ChannelTextAreaContainer');
    inject('scrollableAutocomplete-selection', ChannelTextAreaContainer.type, 'render', (_, res) => {
      const ChannelEditorContainer = findInReactTree(res, n => n.type && n.type.displayName === 'ChannelEditorContainer');
      if (ChannelEditorContainer) {
        const { onMoveSelection } = ChannelEditorContainer.props;

        ChannelEditorContainer.props.onMoveSelection = (index) => {
          const selectedAutocomplete = document.querySelector(`.${this.classes.selected}`);
          if (selectedAutocomplete) {
            const scroller = selectedAutocomplete.parentNode.parentNode;
            const autocompleteRows = Array.from(document.querySelectorAll(`.${this.classes.autocompleteRow} > .${this.classes.selectable}`));
            const state = {
              selectedAutocomplete: autocompleteRows.findIndex(row => row === selectedAutocomplete),
              autocompletes: autocompleteRows.length
            };

            if (state.selectedAutocomplete + index >= state.autocompletes) {
              scroller.scrollTop = 0;
            } else if (state.selectedAutocomplete + index < 0) {
              scroller.scrollTop = scroller.scrollHeight;
            } else {
              scroller.scrollTop = selectedAutocomplete.offsetTop - 32;
            }
          }

          return onMoveSelection(index);
        };
      }

      return res;
    });
  }

  pluginWillUnload () {
    this.results.queryEmojiResults = this.results.__oldQueryEmojiResults;

    uninject('scrollableAutocomplete-scrollbar');
    uninject('scrollableAutocomplete-selection');

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
