import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Toggle from '../common/Toggle';
import Button from '../common/Button';
import { extractApiErrorMessage } from '../../utils/errorUtils';

export const AddCategoryModal = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a category name.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await onAdd({
        name: name.trim(),
        description: description.trim(),
        status: isActive ? 'Active' : 'Inactive'
      });
      setName('');
      setDescription('');
      setIsActive(true);
      onClose();
    } catch (err) {
      console.error('Error creating category:', err);
      const apiErr = extractApiErrorMessage(err, 'Failed to create category. Please check the entered data.');
                     
      if (apiErr && (apiErr.toLowerCase().includes('unique') || apiErr.toLowerCase().includes('already exists'))) {
        setErrorMsg('A category with this name already exists.');
      } else {
        setErrorMsg(apiErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const footerActions = (
    <>
      <Button variant="light" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} loading={loading}>
        Add Category
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} title="Create New Category" onClose={onClose} footerActions={footerActions}>
      <form onSubmit={handleSubmit}>
        {errorMsg && (
          <div className="alert alert-danger py-2 small mb-3">
            {errorMsg}
          </div>
        )}

        <Input 
          label="Category Name" 
          placeholder="e.g. Pasta, Chaat, Healthy Bowls, Pizza..." 
          value={name} 
          onChange={(e) => {
            setName(e.target.value);
            if (errorMsg) setErrorMsg('');
          }} 
          required 
        />
        
        <Input 
          label="Description (Optional)" 
          placeholder="Brief description of this category" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
        />

        <Toggle 
          label="Set Category Active" 
          checked={isActive} 
          onChange={() => setIsActive(!isActive)} 
        />
      </form>
    </Modal>
  );
};

export default AddCategoryModal;
