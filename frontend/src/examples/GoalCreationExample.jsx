/**
 * Example: Goal Creation with Premium Enforcement
 * 
 * This file demonstrates how to integrate premium checks into existing components
 * Copy this pattern to your actual goal creation component
 */

import React, { useState, useEffect } from 'react';
import { useGoalLimits, usePremiumStatus } from '../../hooks/usePremium';
import { UpgradeModal } from '../premium/UpgradeModal';
import { LimitIndicator, FeatureLock } from '../premium/PremiumComponents';

export const GoalCreationExample = () => {
  const [goals, setGoals] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subgoals: []
  });
  
  const { isPremium } = usePremiumStatus();
  const goalLimits = useGoalLimits(goals.length);
  
  // Fetch current goals count
  useEffect(() => {
    fetchGoals();
  }, []);
  
  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/goals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend validation (UX only - server validates too)
    if (!goalLimits.canCreate) {
      setShowUpgradeModal(true);
      return;
    }
    
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.status === 403) {
        const data = await response.json();
        if (data.requiresPremium) {
          setShowUpgradeModal(true);
          return;
        }
      }
      
      if (response.ok) {
        const data = await response.json();
        setGoals([...goals, data.goal]);
        setFormData({ title: '', description: '', subgoals: [] });
        alert('Goal created successfully!');
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
      alert('Failed to create goal. Please try again.');
    }
  };
  
  const addSubgoal = () => {
    const maxSubgoals = isPremium ? 10 : 1;
    if (formData.subgoals.length >= maxSubgoals) {
      if (!isPremium) {
        setShowUpgradeModal(true);
      }
      return;
    }
    setFormData({
      ...formData,
      subgoals: [...formData.subgoals, { title: '', completed: false }]
    });
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Goal</h2>
        
        {/* Limit Indicator */}
        <LimitIndicator
          current={goals.length}
          max={goalLimits.maxGoals}
          label="Active Goals"
          className="mb-6"
        />
        
        {/* Conditional rendering based on limit */}
        {!goalLimits.canCreate ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You've reached your goal limit ({goalLimits.maxGoals} active goals).
                  <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="font-medium underline ml-1"
                  >
                    Upgrade to premium
                  </button>
                  {' '}to create more goals.
                </p>
              </div>
            </div>
          </div>
        ) : null}
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Goal Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={!goalLimits.canCreate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="e.g., Learn Spanish"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!goalLimits.canCreate}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Describe your goal..."
            />
          </div>
          
          {/* Subgoals Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Subgoals ({formData.subgoals.length}/{isPremium ? 10 : 1})
              </label>
              <button
                type="button"
                onClick={addSubgoal}
                disabled={!goalLimits.canCreate || formData.subgoals.length >= (isPremium ? 10 : 1)}
                className="text-sm text-yellow-600 hover:text-yellow-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                + Add Subgoal
              </button>
            </div>
            
            {/* Feature Lock for Subgoals (if free user with 1+ subgoal) */}
            {!isPremium && formData.subgoals.length >= 1 && (
              <p className="text-xs text-yellow-600 mb-2">
                Premium users can add up to 10 subgoals per goal.
                <button 
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="underline ml-1"
                >
                  Upgrade now
                </button>
              </p>
            )}
            
            {formData.subgoals.map((subgoal, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={subgoal.title}
                  onChange={(e) => {
                    const newSubgoals = [...formData.subgoals];
                    newSubgoals[index].title = e.target.value;
                    setFormData({ ...formData, subgoals: newSubgoals });
                  }}
                  disabled={!goalLimits.canCreate}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm disabled:bg-gray-100"
                  placeholder={`Subgoal ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      subgoals: formData.subgoals.filter((_, i) => i !== index)
                    });
                  }}
                  disabled={!goalLimits.canCreate}
                  className="px-3 py-2 text-red-600 hover:text-red-700 disabled:text-gray-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          
          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData({ title: '', description: '', subgoals: [] })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!goalLimits.canCreate}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {goalLimits.canCreate ? 'Create Goal' : 'Limit Reached'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        preselectedPlan="annual"
      />
    </div>
  );
};
