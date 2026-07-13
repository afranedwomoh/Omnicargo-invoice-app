import React from 'react'
import { Package, TrendingUp, BarChart3, Settings, ArrowRight } from 'lucide-react'

export const Analysis: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Company Logo and Branding */}
        <div className="mb-8">
          <div className="flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mx-auto mb-6 shadow-lg">
            <img 
              src="/logoomni-removebg-preview.png" 
              alt="OmniCargo Solutions" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            OmniCargo Solutions
          </h1>
          <p className="text-gray-600">Professional Freight Forwarding Services</p>
        </div>

        {/* Under Development Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          {/* 404 Style Illustration */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="p-4 bg-primary-100 rounded-xl">
                <TrendingUp className="w-12 h-12 text-primary-600" />
              </div>
              <div className="text-6xl font-bold text-secondary-900">404</div>
              <div className="p-4 bg-secondary-100 rounded-xl">
                <BarChart3 className="w-12 h-12 text-secondary-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-secondary-900 mb-4">
              Analysis Section Under Development
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              We're working hard to bring you comprehensive profit analysis and business insights. 
              This powerful feature will help you track your freight forwarding business performance 
              with detailed reports and analytics.
            </p>
          </div>

          {/* Feature Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border border-primary-200">
              <div className="p-2 bg-primary-500 rounded-lg w-fit mb-3">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">Profit Analysis</h3>
              <p className="text-sm text-gray-600">Track revenue, costs, and profit margins across all your shipments</p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl border border-secondary-200">
              <div className="p-2 bg-secondary-500 rounded-lg w-fit mb-3">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">Performance Reports</h3>
              <p className="text-sm text-gray-600">Detailed insights into your business performance and trends</p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
              <div className="p-2 bg-green-500 rounded-lg w-fit mb-3">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">Volume Analytics</h3>
              <p className="text-sm text-gray-600">Monitor CBM volumes and shipping efficiency metrics</p>
            </div>
          </div>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full font-medium shadow-lg">
            <Settings className="w-5 h-5 mr-2" />
            Coming Soon
            <ArrowRight className="w-5 h-5 ml-2" />
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600">
              <strong>Stay tuned!</strong> We're implementing advanced analytics features including 
              profit tracking, performance dashboards, and comprehensive business insights to help 
              you make data-driven decisions for your freight forwarding operations.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Questions? Contact us at{' '}
            <a 
              href="mailto:omnicargosolutionslimited@gmail.com" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              omnicargosolutionslimited@gmail.com
            </a>
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Visit us at{' '}
            <a 
              href="https://omnicargosolutions.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-secondary-600 hover:text-secondary-700 font-medium"
            >
              omnicargosolutions.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
