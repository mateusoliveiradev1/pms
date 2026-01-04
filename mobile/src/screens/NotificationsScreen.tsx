import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import api from '../services/api';
import Header from '../ui/components/Header';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [animateTick, setAnimateTick] = useState(0);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.log('Error loading notifications', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      // Update local state
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.log('Error marking as read', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
        case 'STOCK': return 'alert-circle';
        case 'ORDER': return 'cart';
        default: return 'information-circle';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
        case 'STOCK': return '#dc3545';
        case 'ORDER': return '#28a745';
        default: return '#007bff';
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[styles.card, !item.read && styles.unreadCard]} 
      onPress={() => handleMarkAsRead(item.id)}
    >
      <View style={styles.iconContainer}>
         <Ionicons name={getIcon(item.type) as any} size={24} color={getColor(item.type)} />
      </View>
      <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => navigation.goBack()} showLogo logoSize={32} animateLogo={isFocused} animateKey={animateTick} logoDuration={700} />

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setAnimateTick(t => t + 1); loadNotifications(); }} />
        }
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Nenhuma notificação</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
      backgroundColor: '#e8f0fe',
  },
  iconContainer: {
      marginRight: 12,
  },
  textContainer: {
      flex: 1,
  },
  title: {
      fontWeight: 'bold',
      fontSize: 14,
      color: '#333',
      marginBottom: 4,
  },
  message: {
      fontSize: 14,
      color: '#666',
      marginBottom: 4,
  },
  date: {
      fontSize: 10,
      color: '#999',
  },
  dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#007bff',
      marginLeft: 8,
  },
  emptyContainer: {
      alignItems: 'center',
      marginTop: 50,
  },
  emptyText: {
      marginTop: 10,
      color: '#999',
      fontSize: 16,
  }
});

export default NotificationsScreen;
