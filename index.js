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
 * @copyright Copyright (c) 2020-2021 GriefMoDz
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

/* eslint-disable no-unused-expressions, prefer-destructuring */
const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { inject, uninject } = require('powercord/injector');
const { findInReactTree } = require('powercord/util');

const AutocompleteScroller = require('./components/AutocompleteScroller');
const EMOJI_UTILITY_ID = 'pc-emojiUtility';

class ScrollableAutocomplete extends Plugin {
  constructor () {
    super();

    this.scrollerRef = React.createRef();
    this.encounteredErrors = {};
    this.classes = getModule([ 'autocomplete', 'autocompleteRow' ], false);
  }

  async startPlugin () {
    this.loadStylesheet('./style.css');

    this.patchAutocomplete();
    this.patchAutocompleteSelection();
    this.patchAutocompleteResults().then(this.reloadEmojiUtility);
  }

  getScroller () {
    return this.scrollerRef.current;
  }

  async patchAutocompleteResults () {
    const emojiResults = await getModule([ 'initialize', 'getCustomEmojiById' ]);

    const AutocompleteUtils = await getModule([ 'queryEmojiResults', 'matchSentinel' ]);
    inject('scrollableAutocomplete-emoji-results-1', AutocompleteUtils, 'queryEmojiResults', ([ props ], res) => {
      try {
        const { query, channel, intention, matchComparator } = props;
        const emojis = emojiResults.searchWithoutFetchingLatest(channel, query, null, intention, matchComparator);
        if (emojis && emojis.unlocked && emojis.locked) {
          res.emojis = emojis;
        }
      } catch (err) {
        this.displayError('scrollableAutocomplete-emoji-results-1', err);
      }

      return res;
    });

    const { AUTOCOMPLETE_OPTIONS: AutocompleteTypes } = await getModule([ 'AUTOCOMPLETE_OPTIONS' ]);
    inject('scrollableAutocomplete-emoji-results-2', AutocompleteTypes.EMOJIS_AND_STICKERS, 'queryResults', (args, res) => {
      try {
        const [ channel, _, query, intention ] = args;
        const emojis = emojiResults.searchWithoutFetchingLatest(channel, query, null, intention);
        if (emojis && emojis.unlocked && emojis.locked) {
          res.results.emojis = emojis.unlocked;
        }
      } catch (err) {
        this.displayError('scrollableAutocomplete-emoji-results-2', err);
      }

      return res;
    });
  }

  async patchAutocomplete () {
    const Autocomplete = await getModuleByDisplayName('Autocomplete');
    inject('scrollableAutocomplete-scrollbar', Autocomplete.prototype, 'render', (_, res) => {
      const autocompleteList = findInReactTree(res, n => n.props && typeof n.props.children === 'function');
      if (autocompleteList) {
        try {
          autocompleteList.props.children = (oldMethod => (props) => {
            const res = oldMethod(props);
            const autocompleteInner = findInReactTree(res, n => n.key && Array.isArray(n.props.children));
            const autocompleteResults = autocompleteInner?.props?.children[1];

            if (Array.isArray(autocompleteResults)) {
              if (autocompleteResults && autocompleteResults.length > 10 && !autocompleteResults.children) {
                autocompleteInner.props.children[1] = React.createElement(AutocompleteScroller, {
                  scrollerRef: this.scrollerRef,
                  autocompletes: autocompleteResults
                });
              }
            }

            return res;
          })(autocompleteList.props.children);
        } catch (err) {
          uninject('scrollableAutocomplete-emojis');
          uninject('scrollableAutocomplete-emoji-results-1');
          uninject('scrollableAutocomplete-emoji-results-2');

          this.displayError('scrollableAutocomplete-scrollbar', err);
        }
      }

      return res;
    });
  }

  async patchAutocompleteSelection () {
    const _this = this;
    const ChannelEditorContainer = await getModuleByDisplayName('ChannelEditorContainer');
    inject('scrollableAutocomplete-selection', ChannelEditorContainer.prototype, 'render', function (_, res) {
      try {
        const { onMoveSelection } = this.props;

        this.props.onMoveSelection = (direction) => {
          const selectedAutocomplete = document.querySelector(`.${_this.classes.selected}`);
          const autocompleteRows = Array.from(document.querySelectorAll(`.${_this.classes.autocompleteRow} > .${_this.classes.selectable}`));
          const scroller = _this.getScroller() || document.querySelector(`.${_this.classes.autocompleteRow} ~ div`);

          if (selectedAutocomplete && scroller) {
            const state = {
              selectedAutocomplete: autocompleteRows.findIndex(row => row === selectedAutocomplete),
              autocompletes: autocompleteRows.length
            };

            if (state.selectedAutocomplete + direction >= state.autocompletes) {
              scroller.spring ? scroller.scrollToTop({ animate: true }) : (scroller.scrollTop = 0);
            } else if (state.selectedAutocomplete + direction < 0) {
              scroller.spring ? scroller.scrollToBottom({ animate: true }) : (scroller.scrollTop = scroller.scrollHeight);
            } else {
              const offset = selectedAutocomplete.offsetTop - 35.6;
              scroller.spring ? scroller.scrollTo({ to: offset, animate: true }) : (scroller.scrollTop = offset);
            }
          }

          return onMoveSelection(direction);
        };
      } catch (err) {
        _this.displayError('scrollableAutocomplete-selection', err);
      }

      return res;
    });
  }

  pluginWillUnload () {
    uninject('scrollableAutocomplete-emojis');
    uninject('scrollableAutocomplete-emoji-results-1');
    uninject('scrollableAutocomplete-emoji-results-2');
    uninject('scrollableAutocomplete-scrollbar');
    uninject('scrollableAutocomplete-selection');

    this.reloadEmojiUtility();
  }

  displayError (id, err) {
    if (!this.encounteredErrors[id]) {
      this.error(`Failed to patch autocomplete: '${id}' -> ${err} - please contact "${this.manifest.author}" if this error persists!`);
      this.encounteredErrors[id] = true;
    }
  }

  reloadEmojiUtility () {
    if (powercord.pluginManager.get(EMOJI_UTILITY_ID) && powercord.pluginManager.isEnabled(EMOJI_UTILITY_ID)) {
      powercord.pluginManager.remount(EMOJI_UTILITY_ID);
    }
  }
}

module.exports = ScrollableAutocomplete;
