'use client';

import { Truck, RotateCcw, DollarSign, Shield } from 'lucide-react';
import { useShippingSettings } from '@/context/ShippingSettingsContext';

export default function Features() {
  const { settings, zoneSettings, isFreeDeliveryGloballyActive } = useShippingSettings();
  const features = [
    {
      icon: Truck,
      title: isFreeDeliveryGloballyActive && settings?.freeShippingEnabled ? 'Free Delivery' : 'Fast Delivery',
      description: isFreeDeliveryGloballyActive && settings?.freeShippingEnabled
        ? `Above ₹${settings.freeShippingThreshold.toLocaleString('en-IN')}`
        : settings
        ? `Standard ₹${settings.standardShippingCharge.toLocaleString('en-IN')} per order`
        : 'Safe & express delivery',
    },
    {
      icon: RotateCcw,
      title: '7 Days Return',
      description: 'Easy & Hassle Free',
    },
    {
      icon: DollarSign,
      title: 'Cash on Delivery',
      description: 'Pay at Doorstep',
    },
    {
      icon: Shield,
      title: 'Premium Quality',
      description: '100% Original',
    },
  ];
  return (
    <section data-reveal className="py-3.5 sm:py-6 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-14 lg:px-24 xl:px-32">
        {/* Single row on ALL screens: Mobile, Tablet & Desktop */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 md:gap-8 items-center">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-2.5 min-w-0"
            >
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 border border-gray-200 rounded-full flex items-center justify-center bg-gray-50/80 shadow-xs transition-all duration-300 group-hover:-translate-y-1 group-hover:border-[#083028]/25 group-hover:bg-[#083028]/5 group-hover:shadow-md">
                <feature.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-700" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 w-full sm:w-auto">
                <h3 className="font-bold text-gray-800 text-[10px] sm:text-xs md:text-sm leading-tight">
                  {feature.title}
                </h3>
                <p className="text-[9px] sm:text-[11px] md:text-xs text-gray-500 mt-0.5 leading-tight hidden sm:block truncate">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
