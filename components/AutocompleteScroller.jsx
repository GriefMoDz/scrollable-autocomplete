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

const { React, getModule } = require('powercord/webpack');
const { Spinner } = require('powercord/components');

const List = getModule([ 'ListAuto' ], false);

module.exports = class AutocompleteScroller extends React.PureComponent {
  constructor (props) {
    super(props);

    this.state = {
      hasMore: false,
      loadingMore: false,
      lastAutocomplete: null
    };
  }

  componentDidMount () {
    this.loadMore();
  }

  handleScroll () {
    const scroller = this.props.scrollerRef.current;

    if (scroller !== null) {
      const state = scroller.getScrollerState();

      if (state.scrollTop + state.offsetHeight >= state.scrollHeight - 35.6 && this.state.hasMore && !this.state.loadingMore) {
        this.loadMore();
      }
    }
  }

  loadMore () {
    this.setState({
      hasMore: this.props.autocompletes.length !== this.state.lastAutocomplete,
      loadingMore: !0
    });

    setTimeout(() => {
      let lastAutocomplete = null;

      if (!this.state.lastAutocomplete) {
        lastAutocomplete = Math.min(15, this.props.autocompletes.length);
      }

      this.setState({
        loadingMore: !1,
        lastAutocomplete: lastAutocomplete || Math.min(this.state.lastAutocomplete + 15, this.props.autocompletes.length)
      });
    }, 500);
  }

  getRowHeight (section, row) {
    const { autocompletes } = this.props;
    if (section === 1) {
      return row === 0 ? 35.6 : 0;
    }

    if (section === 0) {
      if (!this.state.lastAutocomplete && row === 0) {
        return 356;
      }

      if (autocompletes[row] !== null) {
        return 35.6;
      }
    }

    return 0;
  }

  renderRow (item) {
    const { section, row } = item;

    if (section === 1 && row === 0) {
      return React.createElement(Spinner, {
        className: 'scrollableAutocomplete-spinnerMore'
      }, 'hasMore');
    } else if (!this.state.lastAutocomplete && this.state.loadingMore) {
      return React.createElement(Spinner, {
        className: 'scrollableAutocomplete-spinner'
      }, 'loadingMore');
    } else if (this.props.autocompletes[row] !== null) {
      return this.props.autocompletes[row];
    }

    return null;
  }

  render () {
    const autocompleteSections = [];
    const { autocompletes } = this.props;

    if (!this.state.lastAutocomplete && this.state.loadingMore) {
      autocompleteSections.push(length);
    } else {
      autocompleteSections.push(autocompletes.slice(0, this.state.lastAutocomplete).length);

      if (this.state.hasMore) {
        autocompleteSections.push(1);
      }
    }

    return React.createElement(List.default, {
      className: 'scrollableAutocomplete-scroller',
      ref: this.props.scrollerRef,
      sections: autocompleteSections,
      sectionHeight: 0,
      rowHeight: this.getRowHeight.bind(this),
      renderRow: this.renderRow.bind(this),
      renderSection: () => null,
      onScroll: this.state.hasMore ? this.handleScroll.bind(this) : void 0
    });
  }
};
