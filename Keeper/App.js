import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
} from 'react-native';
import io from 'socket.io-client';
import CryptoJS from 'react-native-crypto-js';

const key = 'your_secret_key'; // Replace this with your secret key

const socket = io('http://192.168.255.41:5555');

const App = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [inChatRoom, setInChatRoom] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userIds, setUserIds] = useState([]); // Array to store user IDs

  const flatListRef = useRef(null); // Reference for the FlatList component

  useEffect(() => {
    const messageListener = msg => {
      console.log(msg); // Scroll to the bottom when a new message is received
      setMessages(prevMessages => [...prevMessages, msg]);
      scrollToBottom();
    };

    const userIdsListener = receivedUserIds => {
      setUserIds(receivedUserIds);
      console.log('User IDs:', receivedUserIds); // Print the user IDs
    };

    socket.on('message', messageListener);
    socket.on('userIds', userIdsListener);

    return () => {
      socket.off('message', messageListener);
      socket.off('userIds', userIdsListener);
    };
  }, []);
  // Empty dependency array ensures useEffect runs only once when the component mounts

  useEffect(() => {
    if (inChatRoom) {
      const newUserId = (Date.now() % 1000).toString();
      setUserId(newUserId);
      setUserIds(prevUserIds => [...prevUserIds, newUserId]); // Add new user ID to array
    }
  }, [inChatRoom]);

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({animated: true});
    }
  };

  const handleSetName = () => {
    if (name.trim() === '') return;
    setInChatRoom(true);
  };

  const handleSend = async () => {
    if (message.trim() === '') return;

    let newMessage;

    // Check if the message contains any recipient IDs for encryption
    const pattern = /^(.*?)\s+#(\d+)\b/g; // Adjusted regex pattern
    const matches = [...message.matchAll(pattern)];

    if (matches.length > 0) {
      const recipientIds = matches.map(match => parseInt(match[2]));
      const encryptedMessage = await encryptMessage(
        matches[0][1],
        recipientIds,
      );

      newMessage = {
        name,
        message: encryptedMessage,
        sender: userId,
        encrypted: true,
        recipients: recipientIds, // Store recipient IDs for display
      };
    } else {
      newMessage = {
        name,
        message,
        sender: userId,
        encrypted: false,
      };
    }

    socket.emit('message', newMessage);
    setMessage('');
  };

  const encryptText = text => {
    return CryptoJS.AES.encrypt(text, key).toString();
  };

  const encryptMessage = async (message, recipientIds) => {
    const encryptedMessages = await Promise.all(
      recipientIds.map(async recipientId => {
        const encryptedText = encryptText(message);
        return `${encryptedText} #${recipientId}`;
      }),
    );

    return encryptedMessages.join('\n');
  };

  const decryptMessage = (encryptedMessage, currentUserId) => {
    const parts = encryptedMessage.split('#');
    const encryptedText = parts[0];
    const recipientIds = parts.slice(1).map(id => parseInt(id.trim()));

    if (recipientIds.includes(currentUserId) || parts[1] === currentUserId) {
      return CryptoJS.AES.decrypt(encryptedText, key).toString(
        CryptoJS.enc.Utf8,
      );
    } else {
      return 'Encrypted Text';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>GroupIn</Text>

      {!inChatRoom && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
          />
          <Button title="Set Name" onPress={handleSetName} />
        </View>
      )}

      {inChatRoom && (
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({item}) => {
              let messageText = item.message;

              if (item.encrypted) {
                messageText = decryptMessage(item.message, userId);
              }

              return (
                <View
                  style={[
                    styles.messageContainer,
                    {
                      alignSelf:
                        item.sender === userId ? 'flex-end' : 'flex-start',
                      backgroundColor:
                        item.sender === userId ? '#344955' : '#50727B',
                      marginRight: item.sender === userId ? 0 : '50%',
                      marginLeft: item.sender === userId ? '50%' : 0,
                    },
                  ]}>
                  <Text style={styles.sender}>
                    {item.name} (#{item.sender}){' '}
                    {item.encrypted && item.recipients.includes(userId)
                      ? '- To You'
                      : ''}{' '}
                    -
                  </Text>
                  <Text style={styles.messageText}>{messageText}</Text>
                </View>
              );
            }}
            keyExtractor={(item, index) => index.toString()}
            style={styles.messages}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              value={message}
              onChangeText={setMessage}
            />
            <Button title="Send" onPress={handleSend} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFEC',
  },
  heading: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#D2D180',
    fontStyle: 'italic',
  },
  chatContainer: {
    flex: 1,
    width: '100%',
  },
  messages: {
    flex: 1,
    marginBottom: 20,
    color: 'black',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  sender: {
    fontWeight: 'bold',
    marginRight: 5,
    color: 'white',
  },
  messageText: {
    flex: 1,
    color: 'white',
  },
  input: {
    flex: 1,
    padding: 10,
    marginRight: 10,
    color: 'black',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderRadius: 30,
    borderColor: 'black',
    paddingHorizontal: 15,
  },
});

export default App;
