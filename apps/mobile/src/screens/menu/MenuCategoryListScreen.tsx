// ========================================
// apps/mobile/src/screens/menu/MenuCategoryListScreen.tsx
// Catálogo completo de platos con categorías, filtro y búsqueda (RF-05/06/07)
// ========================================

import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useMenu } from '../../context/MenuContext';

const MenuCategoryListScreen: React.FC = () => {
  const { categories, menuItems, isLoading, error, searchQuery, setSearchQuery } = useMenu();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filtrar productos por búsqueda y categoría seleccionada
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? item.category_id === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error al cargar el menú: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de Búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar platos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtro de Categorías */}
      <View style={styles.categoriesContainer}>
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.selectedChip]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.chipText, !selectedCategory && styles.selectedChipText]}>Todos</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, selectedCategory === cat.id && styles.selectedChip]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[styles.chipText, selectedCategory === cat.id && styles.selectedChipText]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de Platos */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.menuCard}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>WOK</Text>
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay productos disponibles</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 15,
    paddingTop: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 45,
    fontSize: 14,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingVertical: 5,
  },
  categoryChip: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    height: 32,
    justifyContent: 'center',
  },
  selectedChip: {
    backgroundColor: '#D32F2F',
  },
  chipText: {
    color: '#212121',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedChipText: {
    color: '#FFFFFF',
  },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#EEEEEE',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#9E9E9E',
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#757575',
    fontSize: 14,
  },
});

export default MenuCategoryListScreen;