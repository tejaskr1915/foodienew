import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';

export const RenameCategoryModal = ({
  isOpen,
  currentCategoryName,
  currentCategoryDescription = '',
  onClose,
  onSave
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewCategoryName(currentCategoryName && currentCategoryName !== 'All Categories' ? currentCategoryName : '');
      
      let initialDesc = currentCategoryDescription;
      if (!initialDesc && currentCategoryName) {
        try {
          const descMap = JSON.parse(localStorage.getItem('foodie_category_descriptions') || '{}');
          initialDesc = descMap[currentCategoryName] || '';
        } catch (e) {}
      }
      setNewCategoryDescription(initialDesc || '');
    }
  }, [isOpen, currentCategoryName, currentCategoryDescription]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    await onSave(newCategoryName.trim(), newCategoryDescription.trim());
    setLoading(false);
    onClose();
  };

  const footerActions = (
    <>
      <Button variant="light" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} loading={loading}>
        Save Changes
      </Button>
    </>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      title={`Edit Category ${currentCategoryName ? `"${currentCategoryName}"` : ''}`} 
      onClose={onClose} 
      footerActions={footerActions}
    >
      <form onSubmit={handleSubmit}>
        <Input 
          label="Category Name" 
          placeholder="e.g. Indian Meals, North Indian, Starters" 
          value={newCategoryName} 
          onChange={(e) => setNewCategoryName(e.target.value)} 
          required 
        />

        <Input 
          label="Category Description (Optional)" 
          placeholder="e.g. Authentic aromatic Indian meals, thalis and curries" 
          value={newCategoryDescription} 
          onChange={(e) => setNewCategoryDescription(e.target.value)} 
        />

        {currentCategoryName && (
          <p className="text-muted small mb-0 mt-2">
            Updating this category will sync the name and description across customer and admin views.
          </p>
        )}
      </form>
    </Modal>
  );
};

export default RenameCategoryModal;
