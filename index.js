/**
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this plugin in the file LICENSE.md.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/OSL-3.0
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade the plugin to
 * newer versions in the future. If you wish to customize the plugin for
 * your needs please document your changes and make backups before you update.
 *
 *
 * @copyright Copyright (c) 2020 GriefMoDz
 * @license   OSL-3.0 (Open Software License ("OSL") v. 3.0)
 * @link      https://github.com/GriefMoDz/scrollable-autocomplete
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/* eslint-disable no-unused-expressions */
const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { inject, uninject } = require('powercord/injector');
const { findInReactTree } = require('powercord/util');

const AutocompleteScroller = require('./components/AutocompleteScroller');

class ScrollableAutocomplete extends Plugin {
  constructor () {
    super();

    this.scrollerRef = React.createRef();
    this.classes = {
      ...getModule([ 'scrollbar', 'scrollerWrap' ], false),
      ...getModule([ 'autocomplete', 'autocompleteInner' ], false)
    };
  }

  async startPlugin () {
    this.loadStylesheet('./style.css');
    this.patchEmojiResults();

    this.patchAutocomplete();
    this.patchAutocompleteSelection();

    this.reloadEmojiUtility();
  }

  getScroller () {
    return this.scrollerRef.current;
  }

  async patchEmojiResults () {
    const emojiResults = await getModule([ 'initialize', 'search' ]);
    const autocompleteResults = await getModule([ 'queryEmojiResults' ]);
    inject('scrollableAutocomplete-emojis', autocompleteResults, 'queryEmojiResults', ([ query, channel ]) => (
      { emojis: emojiResults.search(channel, query) }
    ));
  }

  async patchAutocomplete () {
    const Autocomplete = await getModuleByDisplayName('Autocomplete');
    inject('scrollableAutocomplete-scrollbar', Autocomplete.prototype, 'render', (_, res) => {
      const autocompleteInner = findInReactTree(res, n => Array.isArray(n));
      if (autocompleteInner && autocompleteInner[0]) {
        try {
          const autocompletes = autocompleteInner[0].props.children[1];
          if (autocompletes && autocompletes.length > 10 && !autocompleteInner[0].props.children[1].children) {
            autocompleteInner[0].props.children[1] = React.createElement(AutocompleteScroller, {
              scrollerRef: this.scrollerRef,
              autocompletes
            });
          }
        } catch (_) {}
      }

      return res;
    });
  }

  async patchAutocompleteSelection () {
    const ChannelTextAreaContainer = await getModule(m => m.type && m.type.render && m.type.render.displayName === 'ChannelTextAreaContainer');
    inject('scrollableAutocomplete-selection', ChannelTextAreaContainer.type, 'render', (_, res) => {
      const ChannelEditorContainer = findInReactTree(res, n => n.type?.displayName === 'ChannelEditorContainer');
      try {
        const { onMoveSelection } = ChannelEditorContainer.props;

        ChannelEditorContainer.props.onMoveSelection = (index) => {
          const selectedAutocomplete = document.querySelector(`.${this.classes.selected}`);
          if (selectedAutocomplete) {
            const scroller = this.getScroller() || selectedAutocomplete.parentNode.parentNode;
            const autocompleteRows = Array.from(document.querySelectorAll(`.${this.classes.autocompleteRow} > .${this.classes.selectable}`));
            const state = {
              selectedAutocomplete: autocompleteRows.findIndex(row => row === selectedAutocomplete),
              autocompletes: autocompleteRows.length
            };

            if (state.selectedAutocomplete + index >= state.autocompletes) {
              scroller.spring ? scroller.scrollToTop() : (scroller.scrollTop = 0);
            } else if (state.selectedAutocomplete + index < 0) {
              scroller.spring ? scroller.scrollToBottom() : (scroller.scrollTop = scroller.scrollHeight);
            } else {
              const offset = selectedAutocomplete.offsetTop - 35.6;
              scroller.spring ? scroller.scrollTo({ to: offset }) : (scroller.scrollTop = offset);
            }
          }

          return onMoveSelection(index);
        };
      } catch (_) {}

      return res;
    });

    ChannelTextAreaContainer.type.render.displayName = 'ChannelTextAreaContainer';
  }

  pluginWillUnload () {
    uninject('scrollableAutocomplete-emojis');
    uninject('scrollableAutocomplete-scrollbar');
    uninject('scrollableAutocomplete-selection');

    this.reloadEmojiUtility();
  }

  reloadEmojiUtility () {
    if (powercord.pluginManager.get('pc-emojiUtility') && powercord.pluginManager.isEnabled('pc-emojiUtility')) {
      powercord.pluginManager.remount('pc-emojiUtility');
    }
  }
}

module.exports = ScrollableAutocomplete;
