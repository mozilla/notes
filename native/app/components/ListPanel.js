import React from 'react';
import { View, ListView, Text } from 'react-native';
import { connect } from 'react-redux';

import ListItem from './ListItem';
import PropTypes from 'prop-types';
//
// import INITIAL_CONTENT from '../data/initialContent';
//
// import NewIcon from './icons/NewIcon';
// import { deleteNote, setFocusedNote, createNote } from '../actions';
// import { formatLastModified } from '../utils/utils';
//

class ListPanel extends React.Component {

  constructor(props) {
    super(props);
    this.props = props;
  }

  componentWillMount() {
  }

  componentDidMount() {

  }

  componentWillUnmount() {
  }

  render() {
    return (
      <View>
        { this.renderList() }
      </View>
    );
  }

  renderList() {
    if (! this.props.state.notes || this.props.state.notes.length <= 0) {
      return (
        <View>
          <Text>No Notes</Text>
        </View>
      )
    } else {
      var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
      var dataSource = ds.cloneWithRows(this.props.state.notes) || []
      return (
          <ListView
            dataSource={dataSource}
            renderRow={(note, sectionID, rowID) => {
              return (
                <ListItem
                  content={note.content}
                  id={note.id}
                />
              )
            }}
          />
      )
    }
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

ListPanel.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(ListPanel)
