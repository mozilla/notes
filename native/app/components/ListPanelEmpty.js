import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import browser from '../browser';

const noNotesMessage = browser.i18n.getMessage('noNotesMessage');

class ListPanelEmpty extends React.Component {
  render() {
    return (
      <View style={styles.noNotes}>
        <Image
          style={{width: 150, height: 150, marginBottom: 30 }}
          source={require('../assets/notes-1024.png')}
        />
        <Text style={styles.centered}>{noNotesMessage}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  noNotes: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40
  },
  centered: {
    textAlign: 'center'
  }
});


export default ListPanelEmpty;
