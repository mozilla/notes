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

        <View style={{ alignItems: 'center', justifyContent: 'flex-end', paddingTop: 15, alignItems: 'center', justifyContent: 'center', width: '80%' }}>
          <Image
            style={{width: 150, height: 150 }}
            source={require('../assets/notes-1024.png')}
          />
          <Text style={{ fontWeight: 'bold', fontSize: 24, padding: 10, paddingTop: 30, paddingBottom: 30 }}>
            { i18nGetMessage('welcomeTitle4') }
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 16, paddingBottom: 30, textAlign: 'center', lineHeight: 22 }}>{ i18nGetMessage('welcomeHeadline') }</Text>
          <Button loading={this.state.isLoading} raised onPress={this.onAuth.bind(this)} color={COLOR_NOTES_BLUE}
            style={styles.btnSignin}><Text style={{ fontSize: 14 }}>{ i18nGetMessage('signIn') }</Text></Button>

          <Text style={{ fontSize: 14, paddingTop: 25, textAlign: 'center', lineHeight: 18, paddingBottom: 10  }}>
            { i18nGetMessage('usageHint') }
          </Text>
          <Text style={{color: COLOR_NOTES_BLUE, fontSize: 14, lineHeight: 18, textDecorationLine: 'underline'}}
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
    minWidth: 160,
    borderRadius: 25,
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 5,
    paddingBottom: 5
  },
});

export default connect(mapStateToProps)(LoginPanel)
