import numpy as np, cv2
first=np.load('first.npy')
im=cv2.imread('../hello/frames/f081.png')
for i in range(5,60):
    ys,xs=np.where(first==i)
    if len(xs)<30: continue
    cx,cy=xs.mean(),ys.mean()
    print(i,len(xs),round(cx),round(cy))
    cv2.circle(im,(int(cx),int(cy)),4,(255,255,255),-1)
    cv2.putText(im,str(i),(int(cx)+5,int(cy)-5),0,0.4,(255,255,0),1)
cv2.imwrite('tipcent.png',im[180:500,220:1060])
