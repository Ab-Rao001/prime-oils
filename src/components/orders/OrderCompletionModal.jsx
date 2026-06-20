import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EnterpriseModal, Typography, Badge, Button } from '../ui';
import { dispatchApi } from '../../api/dispatchApi';

export default function OrderCompletionModal({ isOpen, onClose, orderId }) {
  const [address, setAddress] = useState('');
  
  const { data: dispatch, isLoading, error } = useQuery({
    queryKey: ['dispatchForOrder', orderId],
    queryFn: () => dispatchApi.getDispatchByOrder(orderId),
    enabled: !!orderId && isOpen,
  });

  useEffect(() => {
    if (dispatch?.proofOfDelivery?.gpsLocation?.length === 2) {
       const [lon, lat] = dispatch.proofOfDelivery.gpsLocation;
       fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`)
         .then(res => res.json())
         .then(data => {
            if (data && data.display_name) {
               setAddress(data.display_name);
            }
         })
         .catch(err => console.error('Geocoding failed:', err));
    } else {
       setAddress('');
    }
  }, [dispatch]);

  return (
    <EnterpriseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Order Delivery Details"
      size="md"
    >
      <div className="flex flex-col gap-5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Typography variant="body" className="text-muted-foreground animate-pulse">Loading delivery data...</Typography>
          </div>
        ) : error ? (
          <div className="p-4 bg-danger/10 text-danger rounded-xl">
            <Typography variant="body" className="font-semibold">Failed to load delivery details.</Typography>
            <Typography variant="caption">{error.message || 'No dispatch record found.'}</Typography>
          </div>
        ) : dispatch ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-border dark:border-border-dark">
                <Typography variant="caption" className="text-muted-foreground uppercase font-bold tracking-wider mb-1">Outcome</Typography>
                <div className="flex items-center gap-2">
                  <Badge variant={dispatch.deliveryStatus === 'DELIVERED' ? 'success' : dispatch.deliveryStatus === 'FAILED' ? 'danger' : 'warning'}>
                    {dispatch.deliveryStatus}
                  </Badge>
                </div>
              </div>

              <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-border dark:border-border-dark">
                <Typography variant="caption" className="text-muted-foreground uppercase font-bold tracking-wider mb-1">Time</Typography>
                <Typography variant="body" className="font-semibold text-foreground">
                  {dispatch.arrivalTime ? new Date(dispatch.arrivalTime).toLocaleString() : 'N/A'}
                </Typography>
              </div>
            </div>

            <div className="p-4 bg-card border border-border dark:border-border-dark rounded-xl flex flex-col gap-3">
              <Typography variant="h4" className="m-0 border-b border-border dark:border-border-dark pb-2">Vehicle & Driver</Typography>
              <div className="grid grid-cols-2 gap-y-2">
                 <Typography variant="caption" className="text-muted-foreground">Driver Name:</Typography>
                 <Typography variant="body" className="font-semibold text-right">{dispatch.driver?.name || 'Unknown'}</Typography>
                 
                 <Typography variant="caption" className="text-muted-foreground">Driver Phone:</Typography>
                 <Typography variant="body" className="font-semibold text-right">{dispatch.driver?.phone || 'N/A'}</Typography>
                 
                 <Typography variant="caption" className="text-muted-foreground">Vehicle:</Typography>
                 <Typography variant="body" className="font-semibold text-right">
                    {dispatch.vehicle ? `${dispatch.vehicle.plateNumber} (${dispatch.vehicle.model})` : 'Unknown'}
                 </Typography>
              </div>
            </div>

            {dispatch.proofOfDelivery && (
               <div className="p-4 bg-card border border-border dark:border-border-dark rounded-xl flex flex-col gap-3">
                  <Typography variant="h4" className="m-0 border-b border-border dark:border-border-dark pb-2">Proof of Delivery</Typography>
                  <div className="grid grid-cols-2 gap-y-2">
                     <Typography variant="caption" className="text-muted-foreground">Receiver:</Typography>
                     <Typography variant="body" className="font-semibold text-right">{dispatch.proofOfDelivery.receiverName || 'Not recorded'}</Typography>
                     
                     <Typography variant="caption" className="text-muted-foreground">Phone:</Typography>
                     <Typography variant="body" className="font-semibold text-right">{dispatch.proofOfDelivery.receiverPhone || 'N/A'}</Typography>
                  </div>
                  
                  {dispatch.proofOfDelivery.gpsLocation && dispatch.proofOfDelivery.gpsLocation.length === 2 && (
                    <div className="mt-2">
                      <Typography variant="caption" className="text-muted-foreground">Location:</Typography>
                      <Typography variant="body" className="font-medium text-info break-words line-clamp-3">
                        {address || 'Fetching textual address...'}
                      </Typography>
                      {!address && (
                        <Typography variant="caption" className="text-muted-foreground text-xs block mt-1">
                          {dispatch.proofOfDelivery.gpsLocation[1].toFixed(6)}, {dispatch.proofOfDelivery.gpsLocation[0].toFixed(6)}
                        </Typography>
                      )}
                    </div>
                  )}

                  {dispatch.proofOfDelivery.notes && (
                    <div className="mt-2 p-3 bg-black/5 dark:bg-white/5 rounded-lg">
                      <Typography variant="caption" className="text-muted-foreground italic">&quot;{dispatch.proofOfDelivery.notes}&quot;</Typography>
                    </div>
                  )}
               </div>
            )}

            {dispatch.failureReason && dispatch.deliveryStatus === 'FAILED' && (
              <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl">
                 <Typography variant="h4" className="text-danger m-0 mb-2">Failure Reason</Typography>
                 <Typography variant="body" className="font-medium text-danger">{dispatch.failureReason}</Typography>
              </div>
            )}
          </>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-border dark:border-border-dark pt-4">
         <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </EnterpriseModal>
  );
}
