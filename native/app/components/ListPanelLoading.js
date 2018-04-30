
import React from 'react';
import { COLOR_NOTES_BLUE } from '../utils/constants';

import { View, FlatList, StyleSheet, RefreshControl, AppState } from 'react-native';
import ListItemSkeleton from './ListItemSkeleton';

class ListPanelLoading extends React.Component {

  constructor(props) {
    super(props);
    this._keyExtractor = (item, index) => `${item}`;
  }

  render() {
    return (
      <FlatList
        contentContainerStyle={{ marginBottom:90 }}
        data={[1, 2, 3, 4, 5]}
        ListHeaderComponent={() => {
          return (
            <View style={{ backgroundColor: 'white', height: 10}}></View>
          );
        }}
        keyExtractor={this._keyExtractor}
        renderItem={({ index }) => {
          return (
            <ListItemSkeleton index={index} />
          )
        }}
        ListFooterComponent={() => {
          return (
            <View style={{
              height: 1,
              backgroundColor: '#F9F9FA',
              overflow: 'visible',
              marginBottom: 90,
              elevation: 1,
              shadowColor: '#000',
              shadowOpacity: 0.24,
              shadowOffset: { width: 0, height: 0.75},
              shadowRadius: 1.5}}>
            </View>
          );
        }}
      />
    );
  }
}


export default ListPanelLoading;
