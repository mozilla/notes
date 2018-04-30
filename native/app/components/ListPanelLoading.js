
import React from 'react';
import { View, ProgressBarAndroid } from 'react-native';
import { COLOR_NOTES_BLUE } from '../utils/constants';

class ListPanelLoading extends React.Component {

  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ProgressBarAndroid color={COLOR_NOTES_BLUE} styleAttr="Inverse" />
      </View>
    );
  }
}


export default ListPanelLoading;
