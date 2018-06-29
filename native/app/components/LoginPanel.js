import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { Button } from 'react-native-paper';
import { NavigationActions, StackActions } from 'react-navigation';
import { View, Text, ProgressBarAndroid, ToastAndroid, Image, StyleSheet, Linking } from 'react-native';
import { COLOR_NOTES_BLUE } from '../utils/constants';
import i18nGetMessage from '../utils/i18n';

class LoginPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: false
    };
  }

  onAuth () {
    this.setState({ isLoading: true });
    setTimeout(() => {
      this.props.navigation.navigate('LoadingPanel');
    }, 150);
  }

  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9F9FA' }}>
        <View style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 15 }}>
          <Image
            style={{width: 150, height: 150 }}
            source={require('../assets/notes-1024.png')}
          />
          <Text style={{ fontWeight: 'bold', fontSize: 24, padding: 10, paddingTop: 30 }}>
            { i18nGetMessage('welcomeTitle4') }
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 12, paddingBottom: 30 }}>{ i18nGetMessage('welcomeHeadline') }</Text>
          <Button loading={this.state.isLoading} raised onPress={this.onAuth.bind(this)} color={COLOR_NOTES_BLUE}
            style={styles.btnSignin}><Text style={{ fontSize: 14 }}>{ i18nGetMessage('signIn') }</Text></Button>
        </View>
        <View style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 15, width: '80%' }}>
          <Text style={{ fontSize: 12, paddingTop: 20, textAlign: 'center' }}>
            { i18nGetMessage('usageHint') }
          </Text>
          <Text style={{color: COLOR_NOTES_BLUE, fontSize: 12}}
                onPress={() => Linking.openURL('https://testpilot.firefox.com/experiments/notes')}>
            { i18nGetMessage('usageLearnMore') }
          </Text>
        </View>
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

LoginPanel.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};


const styles = StyleSheet.create({
  btnSignin: {
    borderRadius: 25,
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 5,
    paddingBottom: 5
  },
});

export default connect(mapStateToProps)(LoginPanel)
