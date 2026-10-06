import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import MenuCard from '../../components/menu/MenuCard';
import AddMenuModal from '../../components/menu/AddMenuModal';
import EditMenuModal from '../../components/menu/EditMenuModal';
import AddDishModal from '../../components/menu/AddDishModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { menuService } from '../../services/menuService';
import { productService } from '../../services/productService';
import { useAuth } from '../../hooks/useAuth';
import { FiPlus } from 'react-icons/fi';
import { getFrontendCategoryName, normalizeCategoryName } from '../../utils/categoryUtils';

export const Menus = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals status
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddDishOpen, setIsAddDishOpen] = useState(false);
  const [comboMode, setComboMode] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [deletingMenuId, setDeletingMenuId] = useState(null);

  const fetchMenus = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await menuService.getMenus();
      setMenus(data);
    } catch (e) {
      console.error(e);
    }
    if (showLoading) setLoading(false);
  };

  const fetchMenusSilently = async () => {
    try {
      const data = await menuService.getMenus();
      setMenus(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleAddMenu = async (menuData) => {
    if (!isAdmin) return;
    await menuService.createMenu(menuData);
    fetchMenus();
  };

  const handleAddDish = async (dishData) => {
    if (!isAdmin) return;
    await productService.createProduct(dishData);
    fetchMenus();
  };

  const handleEditSave = async (id, menuData) => {
    if (!isAdmin) return;
    await menuService.updateMenu(id, menuData);
    fetchMenus();
  };

  const handleDeleteConfirm = async () => {
    if (!isAdmin) return;
    if (deletingMenuId) {
      const menuToDelete = (menus || []).find(m => String(m.id) === String(deletingMenuId));
      await menuService.deleteMenu(deletingMenuId, menuToDelete?.name || menuToDelete?.originalName);
      setDeletingMenuId(null);
      fetchMenus();
    }
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Manage Menus" 
        showBackButton
        actions={
          isAdmin && (
            <div className="d-flex align-items-center gap-2">
              {menus.length > 0 && (
                <>
                  <Button 
                    onClick={() => {
                      setComboMode(false);
                      setIsAddDishOpen(true);
                    }} 
                    variant="outline-primary" 
                    className="d-flex align-items-center gap-2 py-2 px-3 fw-bold border-danger text-danger bg-white"
                  >
                    <FiPlus /> Add Dish
                  </Button>
                  <Button 
                    onClick={() => {
                      setComboMode(true);
                      setIsAddDishOpen(true);
                    }} 
                    variant="outline-primary" 
                    className="d-flex align-items-center gap-2 py-2 px-3 fw-bold bg-white"
                  >
                    <FiPlus /> Add Combo Offer
                  </Button>
                </>
              )}
              <Button 
                onClick={() => setIsAddOpen(true)} 
                variant="primary" 
                className="d-flex align-items-center gap-2 py-2 px-3"
              >
                <FiPlus /> Create Menu
              </Button>
            </div>
          )
        }
      />

      {loading ? (
        <Loader />
      ) : menus.length === 0 ? (
        <EmptyState
          title="No Menus Configured"
          description={isAdmin ? "Create your first seasonal menu layout to link dishes." : "No active menus found."}
          icon="bi-journal-album"
          buttonText={isAdmin ? "Add Seasonal Menu" : undefined}
          onButtonClick={isAdmin ? () => setIsAddOpen(true) : undefined}
        />
      ) : (
        <div className="row g-3">
          {(() => {
            const uniqueMenus = [];
            const seenCatKeys = new Set();
            (menus || []).forEach(m => {
              const normKey = normalizeCategoryName(getFrontendCategoryName(m.name));
              if (!seenCatKeys.has(normKey)) {
                seenCatKeys.add(normKey);
                uniqueMenus.push(m);
              }
            });
            return uniqueMenus.map((menu) => (
              <div key={menu.id} className="col-12 col-md-6 col-lg-4">
                <MenuCard
                  menu={menu}
                  onEdit={() => setEditingMenu(menu)}
                  onDelete={() => setDeletingMenuId(menu.id)}
                  isAdmin={isAdmin}
                />
              </div>
            ));
          })()}
        </div>
      )}

      {/* Add Modal */}
      {isAdmin && isAddOpen && (
        <AddMenuModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onAdd={handleAddMenu}
        />
      )}

      {/* Add Dish Modal */}
      {isAdmin && isAddDishOpen && (
        <AddDishModal
          isOpen={isAddDishOpen}
          defaultCategory={comboMode ? 'Combo Offer' : ''}
          onClose={() => setIsAddDishOpen(false)}
          onAdd={handleAddDish}
        />
      )}

      {/* Edit Modal */}
      {isAdmin && editingMenu && (
        <EditMenuModal
          isOpen={!!editingMenu}
          menu={editingMenu}
          onClose={() => setEditingMenu(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isAdmin && deletingMenuId && (
        <ConfirmModal
          isOpen={!!deletingMenuId}
          title="Delete Menu"
          message="Are you sure you want to delete this menu? This action will remove all links and cannot be undone."
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingMenuId(null)}
        />
      )}
    </AdminLayout>
  );
};
export default Menus;
