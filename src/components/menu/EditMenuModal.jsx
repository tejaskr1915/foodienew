import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Toggle from '../common/Toggle';
import Button from '../common/Button';

export const EditMenuModal = ({
  isOpen,
  menu,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (menu) {
      setName(menu.name || '');
      setDescription(menu.description || '');
      setIsActive(menu.status === 'Active');
    }
  }, [menu, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    await onSave(menu.id, {
      name,
      description,
      status: isActive ? 'Active' : 'Inactive'
    });
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
    <Modal isOpen={isOpen} title="Edit Seasonal Menu" onClose={onClose} footerActions={footerActions}>
      <form onSubmit={handleSubmit}>
        <Input 
          label="Menu Name" 
          placeholder="e.g. Summer Seasonal Menu" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
        />
        
        <Input 
          label="Description" 
          placeholder="Brief description of the menu items" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
        />

        <Toggle 
          label="Set Menu Active" 
          checked={isActive} 
          onChange={() => setIsActive(!isActive)} 
        />
      </form>
    </Modal>
  );
};
export default EditMenuModal;
