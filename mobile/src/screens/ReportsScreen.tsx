import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import api from '../services/api';

const screenWidth = Dimensions.get("window").width;

interface SalesData {
  date: string;
  total: number;
}

const ReportsScreen: React.FC = () => {
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/reports/sales');
      setData(response.data);
    } catch (error) {
      console.log('Error fetching reports', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for chart
  // Filter to show maybe every 5th label to avoid clutter if 30 days
  const labels = data.map((d, index) => {
      // Show label for every 5th day or first/last
      if (index % 5 === 0 || index === data.length - 1) {
          const parts = d.date.split('-');
          return `${parts[2]}/${parts[1]}`;
      }
      return '';
  });

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: data.length > 0 ? data.map(d => d.total) : [0],
        color: (opacity = 1) => `rgba(35, 31, 124, ${opacity})`, 
        strokeWidth: 2
      }
    ],
    legend: ["Vendas (Últimos 30 dias)"]
  };

  if (loading) {
      return <View style={styles.center}><ActivityIndicator size="large" color="#231F7C" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Relatório de Vendas</Text>
      
      {data.length > 0 ? (
        <View style={styles.chartContainer}>
            <LineChart
                data={chartData}
                width={screenWidth - 32}
                height={220}
                yAxisLabel="R$ "
                chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    decimalPlaces: 2, 
                    color: (opacity = 1) => `rgba(35, 31, 124, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                        borderRadius: 16
                    },
                    propsForDots: {
                        r: "6",
                        strokeWidth: "2",
                        stroke: "#ffa726"
                    }
                }}
                bezier
                style={{
                    marginVertical: 8,
                    borderRadius: 16
                }}
            />
        </View>
      ) : (
          <Text style={styles.noData}>Nenhum dado encontrado para o período.</Text>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  chartContainer: {
      alignItems: 'center'
  },
  noData: {
      textAlign: 'center',
      marginTop: 20,
      color: '#666'
  }
});

export default ReportsScreen;
